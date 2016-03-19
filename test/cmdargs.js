'use strict';

import Code from 'code';
const expect = Code.expect;

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const after = lab.after;

const parseArgs = require('../lib/cmdargs').parseArgs;

describe('Command Line Args Processor', ()=>{
  it('Should return a partial function if only passed shorts', (done)=>{
    const partial = parseArgs({});
    expect(partial).to.be.a.function();
    done();
  });
  it('Should return an options object when passed shorts and args', (done)=>{
    const opts = parseArgs({}, []);
    expect(opts).to.be.an.object();
    done();
  });
  it('Should convert a short to a long flag', (done)=>{
    const shorts = {t: 'test'};
    const args = ['-t'];
    const opts = parseArgs(shorts, args);
    expect(opts).to.be.an.object();
    expect(opts.test).to.be.a.boolean().and.to.equal(true);
    done();
  });
  it('Should convert a short to a long value', (done)=>{
    const shorts = {t: 'test'};
    const args = ['-t', 'value'];
    const opts = parseArgs(shorts, args);
    expect(opts).to.be.an.object();
    expect(opts.test).to.be.a.string().and.to.equal('value');
    done();
  });
  it('Should convert a series of shorts to flags', (done)=>{
    const shorts = {t: 'test', v: 'value', 'f': 'flag'};
    const args = ['-tvf'];
    const opts = parseArgs(shorts, args);
    expect(opts).to.be.an.object();
    expect(opts.test).to.be.a.boolean().and.to.equal(true);
    expect(opts.value).to.be.a.boolean().and.to.equal(true);
    expect(opts.flag).to.be.a.boolean().and.to.equal(true);
    done();
  });
  it('Should add noise values to _', (done)=>{
    const shorts = {t: 'test'};
    const args = [__dirname, 'node', '-t', 'value'];
    const opts = parseArgs(shorts, args);
    expect(opts).to.be.an.object();
    expect(opts.test).to.be.a.string().and.to.equal('value');
    expect(opts._).to.be.an.array().and.to.have.a.length(2).and.to.only.include(args.slice(0, 2));
    done();
  });
  it('Should convert multiple values to an array of values', (done)=>{
    const shorts = {t: 'test'};
    const args = ['-t', 'value', '-t', 'value2'];
    const opts = parseArgs(shorts, args);
    expect(opts).to.be.an.object();
    expect(opts.test).to.be.an.array().and.to.have.a.length(2).and.to.only.include(['value', 'value2']);
    done();
  });
  it('Should throw an error when an unknown short is encountered', (done)=>{
    const args = ['-t', 'value', '-t', 'value2'];
    try{
      parseArgs({}, args);
    }catch(e){
      const error = e.toString();
      expect(error).to.be.a.string().and.to.equal('Error: Unknown argument "t" skipped.');
      done();
    }
  });
});
