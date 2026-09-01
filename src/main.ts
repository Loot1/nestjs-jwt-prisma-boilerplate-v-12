import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());

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

	await app.listen(3333);
}
bootstrap();
