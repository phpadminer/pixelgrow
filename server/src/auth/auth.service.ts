import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

interface WechatSessionResponse {
  openid?: string
  session_key?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async loginWithWechat(code: string) {
    const { openid } = await this.code2Session(code)

    let user = await this.prisma.user.findUnique({
      where: { openId: openid },
    })

    if (!user) {
      // Auto-create family and user on first login
      const family = await this.prisma.family.create({
        data: { name: '我的家庭' },
      })
      user = await this.prisma.user.create({
        data: {
          openId: openid,
          familyId: family.id,
          role: 'PARENT',
          name: '新用户',
        },
      })
    }

    const token = this.jwt.sign({ sub: user.id, openId: user.openId })
    return { access_token: token, user: { id: user.id, name: user.name, role: user.role } }
  }

  private async code2Session(code: string): Promise<{ openid: string; session_key: string }> {
    const appId = this.config.get<string>('WECHAT_APP_ID')
    const secret = this.config.get<string>('WECHAT_APP_SECRET')
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`

    const res = await fetch(url)
    const data: WechatSessionResponse = await res.json()

    if (data.errcode || !data.openid) {
      throw new UnauthorizedException(`WeChat login failed: ${data.errmsg ?? 'unknown error'}`)
    }

    return { openid: data.openid, session_key: data.session_key! }
  }
}
