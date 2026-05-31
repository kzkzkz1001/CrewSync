import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@crewsync/types';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // TODO: validate against DB
  async login(email: string, password: string): Promise<{ accessToken: string }> {
    // Placeholder — replace with real user lookup + bcrypt compare
    if (!email || !password) throw new UnauthorizedException();
    const payload = { sub: 'placeholder-user-id', email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
