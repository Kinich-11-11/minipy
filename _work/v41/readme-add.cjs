const fs=require('fs');
const f='D:/编程/scratch/ai/minipython/_work/v41/README.md';
fs.appendFileSync(f, [
  '',
  '## v4.16 追加',
  '',
  '* P25 位运算：分词器合并 << / >>，rank 按 Python 优先级重建，rightside 增加分支，& | ^ 由 bitop 逐位算。',
  '* P26 推导式：complist 在方括号内切分 body/for/if，range 走数值循环，列表与字符串按元素/字符遍历。',
  '* 教训：新补丁的临时变量名必须先反编译搜一遍（ci 被 compareText/checkASCII 占用，导致推导式只产出一个元素）；',
  '  关键插入后加可达性断言，避免替换字符串没匹配时的静默失效。',
  '* 新增用例集：bit.json（10 条）、comp.json（10 条）、booljson.json（4 条）。',
  '',
].join('\n'));
console.log('README updated');