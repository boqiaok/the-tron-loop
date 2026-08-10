import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createSlug } from './activity-slug';
import { isPostgresUniqueViolation } from './database-error';
import { CreateTagDto } from './dto/create-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  async create(dto: CreateTagDto): Promise<Tag> {
    const slug = createSlug(dto.slug ?? dto.name);

    if (!slug) {
      throw new BadRequestException('Tag name must produce a non-empty slug');
    }

    const tag = this.tagsRepository.create({
      name: dto.name.trim(),
      slug,
    });

    try {
      return await this.tagsRepository.save(tag);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictException(`Tag slug "${slug}" already exists`);
      }

      throw error;
    }
  }

  findAll(): Promise<Tag[]> {
    return this.tagsRepository.find({
      order: { name: 'ASC' },
    });
  }
}
