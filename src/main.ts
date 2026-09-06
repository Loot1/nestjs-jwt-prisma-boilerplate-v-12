import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

const CORS_ORIGINS: string[] = ['http://localhost:5173'];

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const settings = app.get(ConfigService);

	app.useGlobalPipes(new ValidationPipe());

	if (CORS_ORIGINS.length > 0) {
		app.enableCors({ origin: CORS_ORIGINS });
	}

	const config = new DocumentBuilder()
		.setTitle('NestJs-JWTS')
		.setDescription('NestJs-JWTS internal API')
		.setVersion('1.0')
		.addBearerAuth()
		.setContact(
			'NestJs-JWTS',
			'https://github.com/vladwulf/nestjs-jwts/',
			'',
		)
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	await app.listen(settings.getOrThrow<number>('PORT'));
}
bootstrap();
