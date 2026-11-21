const fs=require('fs');
const dir='C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/';
const part=(p)=>{ let t=fs.readFileSync(dir+p,'utf8').replace(/\r/g,'').trimEnd();
  if(p==='tail.txt'){ const i=t.indexOf('// ---- DEBUG'); if(i>=0) t=t.slice(i); }
  return t; };
const parts=['head.txt','p13.txt','p14.txt','p15.txt','p17.txt','p18.txt','p19.txt','p20.txt','p21.txt','p23.txt','p24.txt','p25.txt','p26.txt','p27.txt','p28.txt','p29.txt','p30.txt','p31.txt','p32.txt','p33.txt','p34.txt','p38.txt','p46.txt','p47.txt','p48.txt','p49.txt','p51.txt','p52.txt','p54.txt','p55.txt','p56.txt','p57.txt','p58.txt','p59.txt','p60.txt','p61.txt','p62.txt','p65.txt','p66.txt','p67.txt','p70.txt','p71.txt','p72.txt','p73.txt','p74.txt','p75.txt','p76.txt','p77.txt','p78.txt','p79.txt','p80.txt','p81.txt','p82.txt','p83.txt','p84.txt','p85.txt','p86.txt','p87.txt','p88.txt','p89.txt','p90.txt','p91.txt','p93.txt','p92.txt','p94.txt','p95.txt','p96.txt','p97.txt','p98.txt','p99.txt','p100.txt','p101.txt','p102.txt','p103.txt','p104.txt','p105.txt','p106.txt','p107.txt','p108.txt','p109.txt','p110.txt','p111.txt','p112.txt','p113.txt','p114.txt','p115.txt','p116.txt','p117.txt','p118.txt','p120.txt','p121.txt','p122.txt','p123.txt','p124.txt','p125.txt','p126.txt','p127.txt','p128.txt','p129.txt','p130.txt','p131.txt','p132.txt','p133.txt','p134.txt','p135.txt','p136.txt','p137.txt','p138.txt','p139.txt','p140.txt','p141.txt','p142.txt','p143.txt','p144.txt','p145.txt','p146.txt','p147.txt','p148.txt','p149.txt','p150.txt','p151.txt','p152.txt','p153.txt','p154.txt','p155.txt','p156.txt','p157.txt','p158.txt','p159.txt','p160.txt','p161.txt','p162.txt','p163.txt','p164.txt','p165.txt','p166.txt','p167.txt','p168.txt','p169.txt','p170.txt','p171.txt','p172.txt','p173.txt','p174.txt','p175.txt','p176.txt','p177.txt','p178.txt','p179.txt','p180.txt','p181.txt','p182.txt','p183.txt','p184.txt','p185.txt','p186.txt','p187.txt','p188.txt','p189.txt','p190.txt','p191.txt','p192.txt','p193.txt','p194.txt','p195.txt','p196.txt','p197.txt','p198.txt','p199_kbd.txt','p200.txt','p201.txt','pundo.txt','pfont.txt','pclip.txt','p202.txt','p203.txt','p204.txt','p207.txt','p211.txt','p215.txt','p217.txt','p218.txt','p219.txt','p220.txt','p221.txt','p222.txt','p223.txt','p224.txt','p225.txt','p226.txt','p227.txt','p228.txt','p230.txt','p235.txt','p237.txt','p236.txt','p244.txt','p245.txt','p246.txt','p261.txt','p262.txt','p263.txt','p265.txt','p268.txt','p270.txt','p271.txt','p276.txt','p280.txt','p281.txt','p282.txt','p283.txt','p285.txt','p286.txt','p287.txt','p288.txt','p289.txt','p293.txt','p294.txt','p296.txt','p295.txt','p298.txt','p307.txt','p308.txt','p309.txt','p314.txt','p315.txt','p317.txt','p318.txt','p389.txt','p396.txt','p419.txt','p422.txt','p424.txt','p426.txt','p427.txt','p437.txt','p449.txt','p461.txt','p462.txt','p465.txt','p481.txt','p485.txt','p486.txt','p393.txt','p383.txt','p375.txt','p336.txt','p68.txt','p487.txt','p488.txt','p489.txt','p490.txt','p491.txt','p492.txt','p493.txt','p494.txt','p495.txt','p496.txt','p497.txt','p498.txt','p499.txt','p500.txt','p501.txt','p502.txt','p503.txt','p504.txt','p505.txt','p506.txt','p507.txt','p508.txt','p509.txt','p510.txt','p511.txt','p512.txt','p513.txt','p514.txt','p515.txt','p516.txt','p517.txt','p518.txt','p519.txt','p520.txt','p521.txt','p522.txt','p523.txt','p524.txt','p526.txt','p527.txt','p528.txt','p531.txt','p532.txt','p533.txt','p534.txt','p535.txt','p536.txt','p537.txt','p538.txt','p539.txt','p540.txt','p541.txt','p542.txt','p543.txt','p544.txt','p545.txt','p546.txt','p547.txt','p549.txt','p550.txt','p551.txt','p552.txt','p553.txt','p554.txt','p548.txt','p557.txt','p558.txt','p559.txt','p560.txt','p561.txt','p562.txt','p563.txt','p564.txt','p565.txt','p566.txt','p567.txt','p568.txt','p569.txt','p570.txt','p571.txt','p572.txt','p573.txt','p574.txt','p578.txt','p579.txt','p580.txt','p577.txt','p576.txt','p575.txt','p581.txt','p582.txt','p583.txt','p584.txt','p585.txt','p586.txt','p587.txt','p588.txt','p589.txt','p590.txt','p591.txt','p592.txt','p596.txt','p597.txt','p598.txt','tail.txt'];
// 防止链条里出现重复部件（历史上手滑过两次：p246 出现两遍 → 多出 35 块、探针套件集体掉分）
{
  const seen = new Set(), dups = [];
  for (const p of parts) { if (seen.has(p)) dups.push(p); seen.add(p); }
  if (dups.length) { console.error('assemble: DUPLICATE PARTS -> ' + dups.join(', ')); process.exit(1); }
  for (const p of parts) if (!fs.existsSync(dir+p)) { console.error('assemble: MISSING PART -> ' + p); process.exit(1); }
  console.log('assemble: '+parts.length+' parts, no duplicates');
}
fs.writeFileSync(dir+'build41.js', parts.map(part).join('\n\n')+'\n');
console.log('assembled -> '+fs.readFileSync(dir+'build41.js','utf8').split('\n').length+' lines');






















































