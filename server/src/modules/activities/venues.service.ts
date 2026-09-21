import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto } from './dto/create-venue.dto';
import { Venue } from './entities/venue.entity';
import { UpdateVenueDto } from './dto/update-venue.dto';

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

  async update(id: string, dto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.venuesRepository.findOneBy({ id });
    if (!venue) throw new NotFoundException('Venue not found');
    if (dto.name !== undefined) venue.name = dto.name.trim();
    if (dto.address !== undefined) venue.address = dto.address?.trim() || null;
    if (dto.suburb !== undefined) venue.suburb = dto.suburb?.trim() || null;
    if (dto.city !== undefined) venue.city = dto.city.trim();
    if (dto.latitude !== undefined) venue.latitude = dto.latitude;
    if (dto.longitude !== undefined) venue.longitude = dto.longitude;
    return this.venuesRepository.save(venue);
  }
}
