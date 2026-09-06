import { plainToInstance } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min,
	MinLength,
	validateSync,
} from 'class-validator';

export enum NodeEnv {
	Development = 'development',
	Production = 'production',
	Test = 'test',
}

export class EnvironmentVariables {
	@IsOptional()
	@IsEnum(NodeEnv)
	NODE_ENV: NodeEnv = NodeEnv.Development;

	@IsOptional()
	@IsInt()
	@Min(1)
	PORT: number = 3333;

	@IsString()
	@IsNotEmpty()
	DATABASE_URL: string;

	@IsOptional()
	@IsString()
	SHADOW_DATABASE_URL?: string;

	@IsString()
	@MinLength(32, {
		message:
			'AT_SECRET must be at least 32 characters (openssl rand -hex 32).',
	})
	AT_SECRET: string;

	@IsString()
	@MinLength(32, {
		message:
			'RT_SECRET must be at least 32 characters (openssl rand -hex 32).',
	})
	RT_SECRET: string;
}

export function validate(
	config: Record<string, unknown>,
): Record<string, unknown> {
	const validated = plainToInstance(EnvironmentVariables, config, {
		enableImplicitConversion: true,
		exposeDefaultValues: true,
	});

	const errors = validateSync(validated, { skipMissingProperties: false });
	if (errors.length > 0) {
		const details = errors
			.map((error) => Object.values(error.constraints ?? {}).join(', '))
			.join('\n  - ');
		throw new Error(`Invalid environment:\n  - ${details}`);
	}

	return { ...config, ...validated };
}
