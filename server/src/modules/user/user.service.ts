import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateUserDto } from './user.dto'
import * as crypto from 'crypto'

@Injectable()
export class UserService {
  private readonly jwtSecret: string

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET
    if (process.env.NODE_ENV === 'production' && !secret) {
      throw new Error('JWT_SECRET must be set in production environment')
    }
    this.jwtSecret = secret || 'dev-secret-do-not-use-in-production'
  }

  /**
   * WeChat mini-program login flow:
   * 1. Client calls wx.login() to get a temporary code
   * 2. Server exchanges code for openId via WeChat API
   * 3. Find or create user, return JWT token
   */
  async login(code: string) {
    // Exchange code for openId via WeChat API
    const openId = await this.exchangeCodeForOpenId(code)

    // Find existing user or create a new one
    let user = await this.prisma.user.findUnique({
      where: { openId },
      include: { character: true },
    })

    if (!user) {
      // For new users, we need a familyId. Create a default family.
      const family = await this.prisma.family.create({
        data: { name: 'My Family' },
      })

      user = await this.prisma.user.create({
        data: {
          openId,
          name: 'New User',
          role: 'CHILD',
          familyId: family.id,
        },
        include: { character: true },
      })
    }

    // Generate JWT - deliberately exclude openId from payload
    const token = this.generateToken({
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
        avatar: user.avatar,
        hasCharacter: !!user.character,
      },
    }
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { character: true, family: true },
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
    })
  }

  private async exchangeCodeForOpenId(code: string): Promise<string> {
    const appId = process.env.WX_APP_ID
    const appSecret = process.env.WX_APP_SECRET

    if (!appId || !appSecret) {
      // In development, generate a deterministic fake openId from code
      return `dev_openid_${code}`
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

    const response = await fetch(url)
    const data = (await response.json()) as { openid?: string; errcode?: number; errmsg?: string }

    if (!data.openid) {
      throw new UnauthorizedException(
        `WeChat login failed: ${data.errmsg || 'unknown error'}`,
      )
    }

    return data.openid
  }

  private generateToken(payload: {
    userId: string
    familyId: string
    role: string
  }): string {
    // Simple JWT implementation using HMAC-SHA256
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url')

    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      }),
    ).toString('base64url')

    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url')

    return `${header}.${body}.${signature}`
  }
}
