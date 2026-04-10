import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'

interface WxSessionResponse {
  openid?: string
  session_key?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async loginWithWechat(code: string) {
    const wxSession = await this.getWxSession(code)

    if (!wxSession.openid) {
      throw new UnauthorizedException(wxSession.errmsg || '微信登录失败')
    }

    let user = await this.prisma.user.findUnique({
      where: { openId: wxSession.openid },
    })

    if (!user) {
      // Auto-create family and user for new WeChat users
      const family = await this.prisma.family.create({
        data: { name: '我的家庭' },
      })

      user = await this.prisma.user.create({
        data: {
          familyId: family.id,
          role: 'PARENT',
          name: '微信用户',
          openId: wxSession.openid,
        },
      })
    }

    const token = this.jwtService.sign({ sub: user.id, openId: user.openId })

    return { token, user: this.sanitizeUser(user) }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { family: true, character: true },
    })

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    return this.sanitizeUser(user)
  }

  private async getWxSession(code: string): Promise<WxSessionResponse> {
    const appId = process.env.WX_APP_ID
    const appSecret = process.env.WX_APP_SECRET
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

    const res = await fetch(url)
    return res.json() as Promise<WxSessionResponse>
  }

  private sanitizeUser(user: any) {
    const { openId, ...rest } = user
    return rest
  }
}
