import { ApiProperty } from '@nestjs/swagger';

export class PaginationResponseDTO<T> {
    @ApiProperty({ type: [Object] })
    data: T[];

    @ApiProperty()
    page: number;

    @ApiProperty()
    pageSize: number;

    @ApiProperty()
    total: number;

    @ApiProperty()
    totalPages: number;
}

export type PaginationResponse<T> = PaginationResponseDTO<T>;