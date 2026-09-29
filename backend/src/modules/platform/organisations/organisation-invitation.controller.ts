import { Controller, Post, Body } from '@nestjs/common';
import { PlatformOrganisationService } from './platform-organisation.service';
import { AcceptInvitationDto } from './dto/operations.dto';
@Controller('auth/organisation-invitations')
export class OrganisationInvitationController {
  constructor(private readonly service: PlatformOrganisationService) {}
  @Post('accept') accept(@Body() dto: AcceptInvitationDto) {
    return this.service.acceptInvitation(dto);
  }
}
