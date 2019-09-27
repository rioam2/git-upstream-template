import chai = require('chai');
import mocha = require('mocha');

const { describe, it } = mocha;
const { expect } = chai;

describe('Basic test', () => {
	it('should pass', () => {
		expect(true).to.be.true;
	});
});
