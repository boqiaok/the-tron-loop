import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto } from './dto/create-venue.dto';
import { Venue } from './entities/venue.entity';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venuesRepository: Repository<Venue>,
  ) {}

  async create(dto: CreateVenueDto): Promise<Venue> {
    const venue = this.venuesRepository.create({
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      suburb: dto.suburb?.trim() || null,
      city: dto.city?.trim() || 'Hamilton',
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });

    return this.venuesRepository.save(venue);
  }

  findAll(): Promise<Venue[]> {
    return this.venuesRepository.find({
      order: { name: 'ASC' },
    });
  }
}
