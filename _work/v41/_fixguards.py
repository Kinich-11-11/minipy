# fixguards.py -- restructure the two P720 guards with a root-type pre-check:
# only module-class chains and chains rooted in a variable of one of the NEW types are
# intercepted; everything else (instance chains, strings, lists, ...) keeps the v4.228
# paths untouched (evaluating those receivers would nest a STOPTHIS and break them).
import io

src = io.open('p720.txt', encoding='utf-8', newline='').read()

ROOT_TYPE_OK = ("OR(EQ(VAR('evtype'), txt('H')), OR(EQ(VAR('evtype'), txt('Q')), "
  "OR(EQ(VAR('evtype'), txt('W')), OR(EQ(VAR('evtype'), txt('R')), "
  "OR(EQ(VAR('evtype'), txt('P')), OR(EQ(VAR('evtype'), txt('U')), EQ(VAR('evtype'), txt('CPX'))))))))")

MODS_HAS = ("I('data_listcontainsitem', { fields: B.LISTF('ModS'), inputs: { ITEM: B.REP(tokAt(argOf('lo')), [10, '']) } })")
FMN_HAS = ("I('data_listcontainsitem', { fields: B.LISTF('FmN'), inputs: { ITEM: B.REP(tokAt(argOf('lo')), [10, '']) } })")

# ---------- eval guard ----------
old = """    spliceAfter(anchor[0], chain([
      // only dotted spans qualify (the first token must be a name followed by '.'):
      // binary-operation spans may carry a '.' inside the RIGHT operand, and evaluating
      // "d + datetime" as a receiver would only raise a spurious NameError
      IF(AND(GT(SUB(argOf('hi'), argOf('lo')), num(1)),
        AND(EQ(item('Tok', ADD(argOf('lo'), num(1))), txt('.')), NOT(modFnSkip()))), [
        IFELSE(EQ(argOf('hi'), ADD(argOf('lo'), num(2))), [
          setV('zdot', ADD(argOf('lo'), num(1)))
        ], [
          callProc('zddot %s %s', [argOf('lo'), argOf('hi')]),
          setV('zdot', VAR('zdFound'))
        ]),
        // a chained receiver (more than a bare name) must end with a call, otherwise the
        // "dot" may belong to a right-hand operand of a binary operator
        IF(AND(NOT(EQ(VAR('zdot'), num(0))), OR(EQ(VAR('zdot'), ADD(argOf('lo'), num(1))), EQ(item('Tok', SUB(VAR('zdot'), num(1))), txt(')')))), [
          setV('zdT2', tokAt(argOf('lo'))),
          callProc('lookup %s', [VAR('zdT2')]),
          IF(recvNameOk(), [
            addTo('ZdStk', VAR('zdot')),
            callProc('eval %s %s', [argOf('lo'), SUB(VAR('zdot'), num(1))]),
            setV('zdot', item('ZdStk', llen('ZdStk'))), I('data_deleteoflist', { fields: B.LISTF('ZdStk'), inputs: { INDEX: B.REP(txt('last'), [10, '']) } }),
            IF(EQ(VAR('error'), txt('')), [
              IFELSE(AND(EQ(item('Tok', ADD(VAR('zdot'), num(2))), txt('(')), EQ(item('Tok', argOf('hi')), txt(')'))), mkDispatch(), [
                // attribute form: the dotted name must be the LAST token
                IF(EQ(ADD(VAR('zdot'), num(1)), argOf('hi')), mkDispatch())
              ])
            ])
          ])
        ])
      ])
    ]));"""
assert src.count(old) == 1, 'eval guard'

new = """    // the interception body: locate the receiver, evaluate it, dispatch by type.
    // Factory: used for module roots AND for new-type variable roots.
    const mkEvalBody = () => [
      IFELSE(EQ(argOf('hi'), ADD(argOf('lo'), num(2))), [
        setV('zdot', ADD(argOf('lo'), num(1)))
      ], [
        callProc('zddot %s %s', [argOf('lo'), argOf('hi')]),
        setV('zdot', VAR('zdFound'))
      ]),
      // a chained receiver (more than a bare name) must end with a call, otherwise the
      // "dot" may belong to a right-hand operand of a binary operator
      IF(AND(NOT(EQ(VAR('zdot'), num(0))), OR(EQ(VAR('zdot'), ADD(argOf('lo'), num(1))), EQ(item('Tok', SUB(VAR('zdot'), num(1))), txt(')')))), [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(recvNameOk(), [
          addTo('ZdStk', VAR('zdot')),
          callProc('eval %s %s', [argOf('lo'), SUB(VAR('zdot'), num(1))]),
          setV('zdot', item('ZdStk', llen('ZdStk'))), I('data_deleteoflist', { fields: B.LISTF('ZdStk'), inputs: { INDEX: B.REP(txt('last'), [10, '']) } }),
          IF(EQ(VAR('error'), txt('')), [
            IFELSE(AND(EQ(item('Tok', ADD(VAR('zdot'), num(2))), txt('(')), EQ(item('Tok', argOf('hi')), txt(')'))), mkDispatch(), [
              // attribute form: the dotted name must be the LAST token
              IF(EQ(ADD(VAR('zdot'), num(1)), argOf('hi')), mkDispatch())
            ])
          ])
        ])
      ])
    ];
    spliceAfter(anchor[0], chain([
      // only dotted spans qualify (the first token must be a name followed by '.'):
      // binary-operation spans may carry a '.' inside the RIGHT operand, and evaluating
      // "d + datetime" as a receiver would only raise a spurious NameError
      IF(AND(GT(SUB(argOf('hi'), argOf('lo')), num(1)),
        AND(EQ(item('Tok', ADD(argOf('lo'), num(1))), txt('.')), NOT(modFnSkip()))), [
        // module roots: class-constructor chains (modFnSkip already removed mod.fn chains)
        IF(%MODS_HAS%, mkEvalBody()),
        // other roots: only intercept when the ROOT VARIABLE already holds one of the new
        // values -- the pre-check eval is a plain variable read (no nested stop), so
        // instance/string/list chains keep the v4.228 postfix paths untouched
        IFELSE(%FMN_HAS%, [], [
          setV('zdT2', tokAt(argOf('lo'))),
          callProc('lookup %s', [VAR('zdT2')]),
          IF(NOT(EQ(VAR('found'), num(0))), [
            callProc('eval %s %s', [argOf('lo'), argOf('lo')]),
            IF(%ROOT_TYPE_OK%, mkEvalBody())
          ])
        ])
      ])
    ]));"""
new = new.replace('%MODS_HAS%', MODS_HAS).replace('%FMN_HAS%', FMN_HAS).replace('%ROOT_TYPE_OK%', ROOT_TYPE_OK)
src = src.replace(old, new)

# ---------- methodcall guard ----------
old2 = """    const guard = IF(GT(SUB(argOf('hi'), argOf('lo')), num(3)), [
      callProc('zddot %s %s', [argOf('lo'), argOf('hi')]),
      setV('zdot', VAR('zdFound')),
      IF(AND(NOT(modFnSkip()),
        AND(NOT(EQ(VAR('zdot'), num(0))),
          AND(OR(EQ(VAR('zdot'), ADD(argOf('lo'), num(1))), EQ(item('Tok', SUB(VAR('zdot'), num(1))), txt(')'))),
            AND(EQ(item('Tok', ADD(VAR('zdot'), num(2))), txt('(')), EQ(item('Tok', argOf('hi')), txt(')')))))), [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(recvNameOk(), [
          addTo('ZdStk', VAR('zdot')),
          callProc('eval %s %s', [argOf('lo'), SUB(VAR('zdot'), num(1))]),
          setV('zdot', item('ZdStk', llen('ZdStk'))), I('data_deleteoflist', { fields: B.LISTF('ZdStk'), inputs: { INDEX: B.REP(txt('last'), [10, '']) } }),
          IF(EQ(VAR('error'), txt('')), [
            IFELSE(EQ(VAR('evtype'), txt('DCLS')), [
              callProc('dtcls %s %s %s %s', [VAR('ev'), methName(), argLo(), argHi()]),
              chgV('fnlimit', num(-1)),
              STOPTHIS()
            ], [
              IFELSE(OR(EQ(VAR('evtype'), txt('H')), OR(EQ(VAR('evtype'), txt('Q')), EQ(VAR('evtype'), txt('W')))), [
                setV('mraf', num(0)),
                callProc('objmeth %s %s %s %s %s', [VAR('evtype'), VAR('ev'), methName(), argLo(), argHi()]),
                chgV('fnlimit', num(-1)),
                STOPTHIS()
              ], [
                IFELSE(EQ(VAR('evtype'), txt('R')), [
                  callProc('rxmm %s %s %s %s', [VAR('ev'), methName(), argLo(), argHi()]),
                  chgV('fnlimit', num(-1)),
                  STOPTHIS()
                ], [
                  IF(EQ(VAR('evtype'), txt('P')), [
                    setV('rfpat', VAR('ev')),
                    setV('rfp', num(1)),
                    callProc('refn %s %s %s', [methName(), argLo(), argHi()]),
                    setV('rfp', num(0)),
                    chgV('fnlimit', num(-1)),
                    STOPTHIS()
                  ])
                ])
              ])
            ])
          ])
        ])
      ])
    ]);"""
assert src.count(old2) == 1, 'methodcall guard'

new2 = """    const mkMcBody = () => [
      callProc('zddot %s %s', [argOf('lo'), argOf('hi')]),
      setV('zdot', VAR('zdFound')),
      IF(AND(NOT(EQ(VAR('zdot'), num(0))),
        AND(OR(EQ(VAR('zdot'), ADD(argOf('lo'), num(1))), EQ(item('Tok', SUB(VAR('zdot'), num(1))), txt(')'))),
          AND(EQ(item('Tok', ADD(VAR('zdot'), num(2))), txt('(')), EQ(item('Tok', argOf('hi')), txt(')'))))), [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(recvNameOk(), [
          addTo('ZdStk', VAR('zdot')),
          callProc('eval %s %s', [argOf('lo'), SUB(VAR('zdot'), num(1))]),
          setV('zdot', item('ZdStk', llen('ZdStk'))), I('data_deleteoflist', { fields: B.LISTF('ZdStk'), inputs: { INDEX: B.REP(txt('last'), [10, '']) } }),
          IF(EQ(VAR('error'), txt('')), [
            IFELSE(EQ(VAR('evtype'), txt('DCLS')), [
              callProc('dtcls %s %s %s %s', [VAR('ev'), methName(), argLo(), argHi()]),
              chgV('fnlimit', num(-1)),
              STOPTHIS()
            ], [
              IFELSE(OR(EQ(VAR('evtype'), txt('H')), OR(EQ(VAR('evtype'), txt('Q')), EQ(VAR('evtype'), txt('W')))), [
                setV('mraf', num(0)),
                callProc('objmeth %s %s %s %s %s', [VAR('evtype'), VAR('ev'), methName(), argLo(), argHi()]),
                chgV('fnlimit', num(-1)),
                STOPTHIS()
              ], [
                IFELSE(EQ(VAR('evtype'), txt('R')), [
                  callProc('rxmm %s %s %s %s', [VAR('ev'), methName(), argLo(), argHi()]),
                  chgV('fnlimit', num(-1)),
                  STOPTHIS()
                ], [
                  IF(EQ(VAR('evtype'), txt('P')), [
                    setV('rfpat', VAR('ev')),
                    setV('rfp', num(1)),
                    callProc('refn %s %s %s', [methName(), argLo(), argHi()]),
                    setV('rfp', num(0)),
                    chgV('fnlimit', num(-1)),
                    STOPTHIS()
                  ])
                ])
              ])
            ])
          ])
        ])
      ])
    ];
    const guard = IF(GT(SUB(argOf('hi'), argOf('lo')), num(3)), [
      IF(%MODS_HAS%, mkMcBody()),
      IFELSE(%FMN_HAS%, [], [
        setV('zdT2', tokAt(argOf('lo'))),
        callProc('lookup %s', [VAR('zdT2')]),
        IF(NOT(EQ(VAR('found'), num(0))), [
          callProc('eval %s %s', [argOf('lo'), argOf('lo')]),
          IF(%ROOT_TYPE_OK%, mkMcBody())
        ])
      ])
    ]);"""
new2 = new2.replace('%MODS_HAS%', MODS_HAS).replace('%FMN_HAS%', FMN_HAS).replace('%ROOT_TYPE_OK%', ROOT_TYPE_OK)
src = src.replace(old2, new2)

io.open('p720.txt', 'w', encoding='utf-8', newline='\n').write(src)
print('guards restructured')
