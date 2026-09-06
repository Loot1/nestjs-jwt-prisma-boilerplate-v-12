import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';

@Injectable()
export class HashingService {
	hash(value: string): Promise<string> {
		return argon.hash(value);
	}

	verify(hash: string, value: string): Promise<boolean> {
		return argon.verify(hash, value);
	}
}
