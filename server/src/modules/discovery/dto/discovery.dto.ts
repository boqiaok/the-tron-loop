import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ActivityEnvironment } from '../../activities/enums/activity-environment.enum';

export enum TravelMode {
  Driving = 'driving',
  Walking = 'walking',
}

export enum DiscoverySearchScope {
  Day = 'day',
  Week = 'week',
  Weekend = 'weekend',
}

export class RequiredPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  familyFriendly?: boolean;

  @ApiPropertyOptional({
    enum: [
      ActivityEnvironment.Indoor,
      ActivityEnvironment.Outdoor,
      ActivityEnvironment.Mixed,
    ],
  })
  @IsOptional()
  @IsIn([
    ActivityEnvironment.Indoor,
    ActivityEnvironment.Outdoor,
    ActivityEnvironment.Mixed,
  ])
  environment?: ActivityEnvironment;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  freeOnly?: boolean;
}

export class PreferredPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  free?: boolean;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { each: true })
  interests: string[] = [];

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  suburb?: string;
}

export class DiscoveryIntentDto {
  @ApiProperty({ example: '2026-09-19' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  availableFrom!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  availableTo!: string;

  @ApiProperty({ default: 'Pacific/Auckland' })
  @IsIn(['Pacific/Auckland'])
  timezone = 'Pacific/Auckland' as const;

  @ApiProperty({ type: RequiredPreferencesDto })
  @ValidateNested()
  @Type(() => RequiredPreferencesDto)
  required: RequiredPreferencesDto = {};

  @ApiProperty({ type: PreferredPreferencesDto })
  @ValidateNested()
  @Type(() => PreferredPreferencesDto)
  preferred: PreferredPreferencesDto = new PreferredPreferencesDto();

  @ApiProperty({ enum: [2, 3], default: 2 })
  @IsIn([2, 3])
  targetActivityCount: 2 | 3 = 2;

  @ApiProperty({ enum: TravelMode, default: TravelMode.Driving })
  @IsEnum(TravelMode)
  travelMode: TravelMode = TravelMode.Driving;
}

export class ParseDiscoveryDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @Matches(/\S/, { message: 'text must contain a visible character' })
  text!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  referenceTime!: string;

  @ApiProperty({ default: 'Pacific/Auckland' })
  @IsIn(['Pacific/Auckland'])
  timezone = 'Pacific/Auckland' as const;
}

export class RecommendationRequestDto {
  @ApiProperty({ type: DiscoveryIntentDto })
  @ValidateNested()
  @Type(() => DiscoveryIntentDto)
  intent!: DiscoveryIntentDto;

  @ApiPropertyOptional({
    enum: DiscoverySearchScope,
    default: DiscoverySearchScope.Day,
  })
  @IsOptional()
  @IsEnum(DiscoverySearchScope)
  scope: DiscoverySearchScope = DiscoverySearchScope.Day;
}

export class ItineraryRequestDto extends RecommendationRequestDto {
  @ApiProperty({ enum: [2, 3], default: 2 })
  @IsIn([2, 3])
  targetCount: 2 | 3 = 2;

  @ApiProperty({ type: [String], format: 'uuid', default: [] })
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  lockedActivityDateIds: string[] = [];

  @ApiProperty({ type: [String], format: 'uuid', default: [] })
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  excludedActivityDateIds: string[] = [];
}
