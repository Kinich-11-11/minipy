// Diagnostic wrapper for runrepair.mjs: use the real VM and intercept only
// Scratch primitives. No SB3 is written; the optional treatment is in memory.
const VM = require(process.env.N111_REAL_VM);
const fs = require('node:fs');
const tracePath = process.env.N111_TRACE;
const skipNested = process.env.N111_SKIP_NESTED === '1';
const trace = (event, data) => {
  if (tracePath) fs.appendFileSync(tracePath, JSON.stringify({event, ...data}) + '\n');
};

module.exports = class N111VM extends VM {
  async loadProject(...source) {
    const result = await super.loadProject(...source);
    const rt = this.runtime;
    const ps = rt._primitives;
    const stage = rt.getTargetForStage();
    const it = rt.targets.find(t => t.getName() === 'Interpreter');
    const byName = Object.fromEntries([stage, it].flatMap(t => Object.values(t.variables).map(v => [v.name, v])));
    const get = (name) => byName[name]?.value;
    const last = (name) => get(name)?.at(-1);
    const state = () => ({pc:get('pc'), head:get('head'), ev:get('ev'), evtype:get('evtype'),
      frame:get('FrGen').slice(), functions:get('FnStack').slice()});
    const argVals = args => JSON.parse(args.mutation.argumentids || '[]').map(k => args[k]);
    const oldCall = ps.procedures_call;
    ps.procedures_call = (args, util) => {
      if (util.target === it && !util.stackFrame.executed) {
        const id = util.thread.peekStack();
        const proc = args.mutation.proccode;
        const av = argVals(args);
        if (id === 'bproced_4qdbh0d1d') {
          const line = +get('gk');
          const end = +get('Ends')[line - 1];
          if (skipNested && /^\s*(def|class)\s/.test(String(av[0])) && end > line) {
            // Preserve the header tokens, including any enclosing-scope yield
            // expression in defaults. Only skip its body in the line scanner.
            byName.gk.value = end - 1;
            trace('skip-nested', {owner:last('FnName'), line, end, src:av[0]});
          } else trace('scan-line', {owner:last('FnName'), line, end, src:av[0]});
        }
        if (proc === 'regdef %s') trace('regdef', {id, av, ...state()});
        if (proc === 'calluser %s %s %s' || proc.startsWith('genmake ') || proc.startsWith('gnew') || proc.startsWith('unpackto ')) {
          trace('call', {id, proc, av, FnName:get('FnName'), FnKind:get('FnKind'), GHFn:get('GHFn'), ...state()});
        }
        if (proc === 'assign %s %s %s' && /^(a|r|g|x|n|f|read|mutate|outer)$/.test(av[0]) || proc.startsWith('cellWrite763 ') && av[0] === 'a') {
          trace('assign', {id, proc, av, ...state()});
        }
        if (proc === 'fpop') trace('pop', {id, ...state()});
      }
      return oldCall(args, util);
    };
    const oldAdd = ps.data_addtolist;
    ps.data_addtolist = (args, util) => {
      const ret = oldAdd(args, util);
      if (util.target === it && ['FnKind', 'GHFn', 'CloCell', 'CellKey', 'AliasCellN'].includes(args.LIST.name)) {
        trace('add', {list:args.LIST.name, fn:last('FnName'), item:args.ITEM, listValue:get(args.LIST.name), ...state()});
      }
      return ret;
    };
    const oldReplace = ps.data_replaceitemoflist;
    ps.data_replaceitemoflist = (args, util) => {
      const ret = oldReplace(args, util);
      if (util.target === it && ['FnKind', 'CellV', 'CellT', 'GHGen'].includes(args.LIST.name)) {
        trace('replace', {id:util.thread.peekStack(), list:args.LIST.name, fn:last('FnName'), index:args.INDEX, item:args.ITEM, listValue:get(args.LIST.name), ...state()});
      }
      return ret;
    };
    return result;
  }
};
