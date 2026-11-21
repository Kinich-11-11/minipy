const fs = require('fs');
const p = '_work/v41/pz41.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "    setV('dbg', JOIN(VAR('dbg'), txt(' | ATgtHi='))),";
const to = [
  "    setV('dbg', JOIN(VAR('dbg'), txt(' | ATgtHi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), lcont('ATgtHi'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' | augrp='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('augrp'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' auexs='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('auexs'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' auk='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('auk'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' mi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('mi'))),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
// 原来的那行 ATgtHi + fail 需要调整：找到原 ATgtHi 行与其后的 fail
const oldBlock = [
  "    setV('dbg', JOIN(VAR('dbg'), txt(' | ATgtHi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), lcont('ATgtHi'))),",
  "    callProc('fail %s', [VAR('dbg')])"
].join('\n');
const newBlock = [
  "    setV('dbg', JOIN(VAR('dbg'), txt(' | ATgtHi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), lcont('ATgtHi'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' | augrp='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('augrp'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' auexs='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('auexs'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' auk='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('auk'))),",
  "    setV('dbg', JOIN(VAR('dbg'), txt(' mi='))),",
  "    setV('dbg', JOIN(VAR('dbg'), VAR('mi'))),",
  "    callProc('fail %s', [VAR('dbg')])"
].join('\n');
if (!s.includes(oldBlock)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(oldBlock, newBlock));
console.log('ok');
