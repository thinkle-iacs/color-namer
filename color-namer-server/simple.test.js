const { expect } = require('chai');


describe('Simple Test', () => {
  it('should say hello world', () => {
    console.log('Hello, world!');
    expect(true).toBe(true);
  });
});