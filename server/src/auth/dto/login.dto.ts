import { IsString, IsNotEmpty } from 'class-validator'

export class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string
}
