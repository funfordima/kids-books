import { BadRequestException } from "@nestjs/common";

export function validateNonEmptyIdentifier(
  value: string,
  fieldName: string
): string {
  if (value.trim().length === 0) {
    throw new BadRequestException(`${fieldName} must not be empty.`);
  }

  return value;
}
