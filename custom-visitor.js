const { Python3Visitor } = require("./grammar/Python3Visitor");
const { tokens } = require("./grammar/tokens");

const t = require("@babel/types");

function flatten(arr) {
  if (!(arr instanceof Array)) return arr;
  return arr
    .reduce(function(flat, toFlatten) {
      return flat.concat(
        Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
      );
    }, [])
    .filter(Boolean);
}

class CustomVisitor extends Python3Visitor {
  constructor() {
    super();
  }

  isNotIndentation(ctx) {
    return !!ctx.getText().trim();
  }

  visitChildren(ctx) {
    if (!ctx) {
      return;
    }

    if (ctx.children) {
      return flatten(
        ctx.children.filter(this.isNotIndentation).map(child => {
          return child.accept(this);
        })
      );
    }
  }

  getItem(ctx) {
    switch (ctx.symbol && ctx.symbol.type) {
      case tokens.BYTES_LITERAL:
      case tokens.DECIMAL_INTEGER:
      case tokens.OCT_INTEGER:
      case tokens.HEX_INTEGER:
      case tokens.BIN_INTEGER:
      case tokens.FLOAT_NUMBER:
        return t.numericLiteral(ctx.getText);
      case tokens.STRING_LITERAL:
        return t.stringLiteral(ctx.getText);
      default:
        return t.identifier(ctx.getText());
    }
  }

  getExpression(ctx) {
    return t.expressionStatement(this.getIdentifier("n"));
  }

  visitTry_stmt(ctx) {
    const children = ctx.children.filter(
      item => !(this.isTerminalNode(item) && item.symbol.type === tokens.COLON)
    );
    let tryBody,
      catchBody = [],
      finallyBody;
    const expIdentifier = t.identifier("ex");
    while (children.length) {
      const item = children.shift();
      if (this.isTerminalNode(item)) {
        if (item.symbol.type === tokens.TRY) {
          tryBody = this.visitChildren(children.shift());
        }

        if (item.symbol.type === tokens.FINALLY) {
          finallyBody = this.visitChildren(children.shift());
        }
      }
      if (item.constructor.name === "Except_clauseContext") {
        const expType = item.children.filter(
          child => !this.isTerminalNode(child)
        )[0];
        let ifStmt, condition;
        if (expType) {
          condition = t.binaryExpression(
            "instanceof",
            expIdentifier,
            t.identifier(expType.getText())
          );
          ifStmt = t.ifStatement(
            condition,
            t.blockStatement(this.visitChildren(children.shift()))
          );
          catchBody.push(ifStmt);
        } else {
          if (catchBody.length > 0) {
            catchBody.push(
              t.blockStatement(this.visitChildren(children.shift()))
            );
          } else {
            catchBody.push(this.visitChildren(children.shift()));
          }
        }
      }
    }
    if (catchBody.length > 1) {
      this.mapIfAlternates(catchBody);
    }

    return t.tryStatement(
      t.blockStatement(tryBody),
      t.catchClause(expIdentifier, t.blockStatement(flatten([catchBody[0]]))),
      finallyBody ? t.blockStatement(finallyBody) : undefined
    );
  }

  mapThis(item) {
    switch (item.type) {
      case "ExpressionStatement":
        item.expression.name = item.expression.name.replace(/self./g, "this.");
        break;
      case "ReturnStatement":
        item.argument.name = item.argument.name.replace(/self./g, "this.");
        break;
    }
    return item;
  }

  visitClassdef(ctx) {
    const id = t.identifier(ctx.NAME().getText());
    const children = ctx.children;
    const superClasses = ctx.children.filter(
      child => child.constructor.name === "ArglistContext"
    )[0];
    const parent = superClasses ? t.identifier(superClasses.getText()) : null;
    const body = this.visitChildren(children[children.length - 1]).map(
      child => {
        switch (child.type) {
          case "ExpressionStatement":
            return t.classProperty(t.identifier(child.expression.name));
          case "FunctionDeclaration":
            const isConstructor = child.id.name === "__init__";
            const methodId = isConstructor ? "constructor" : child.id.name;
            const methodParams = child.params.filter(
              param => param.name !== "self"
            );
            const methodBlock = child.body;
            methodBlock.body = methodBlock.body.map(this.mapThis);
            const methodBody = methodBlock;
            return t.classMethod(
              isConstructor ? "constructor" : "method",
              t.identifier(methodId),
              methodParams,
              methodBody
            );
        }
      }
    );
    const classBody = t.classBody(body);

    return t.classDeclaration(id, parent, classBody);
  }

  visitExpr_stmt(ctx) {
    let lambdaIndex = ctx.children.reduce(
      (val, item, index) =>
        item.getText().indexOf("lambda") > -1 ? index : val,
      -1
    );
    if (lambdaIndex > -1) {
      const lambdaExpArr = ctx.children.map((item, index) => {
        if (index === lambdaIndex)
          return this.visitChildren(ctx.children[lambdaIndex])[0];
        else return t.identifier(item.getText());
      });
      return t.expressionStatement(
        t.assignmentExpression(
          ctx.children[1].getText(),
          lambdaExpArr[0],
          lambdaExpArr[2]
        )
      );
    } else {
      return t.expressionStatement(t.identifier(ctx.getText()));
    }
  }

  getTerminalNodes(node) {
    const terminalNodes = [];
    if (this.isTerminalNode(node)) return [node.getText()];
    node.children.forEach(child => {
      if (this.isTerminalNode(child)) {
        terminalNodes.push(child.getText());
      } else if (child.children && child.children.length) {
        child.children.forEach(innerChild => {
          return terminalNodes.push(this.getTerminalNodes(innerChild));
        });
      }
    });

    return flatten(terminalNodes);
  }

  visitImport_stmt(ctx) {
    const importItem = ctx.children[0];
    if (importItem.constructor.name === "Import_nameContext") {
      let terminalchildren;
      terminalchildren = this.getTerminalNodes(importItem.children[1]);
      if (terminalchildren.length > 1) {
        return t.importDeclaration(
          [
            t.importSpecifier(
              t.identifier(terminalchildren.pop()),
              t.identifier("default")
            )
          ],
          t.stringLiteral(terminalchildren.shift())
        );
      }

      return t.importDeclaration(
        [],
        t.stringLiteral(importItem.children[1].getText())
      );
    }
    if (importItem.constructor.name === "Import_fromContext") {
      let fromItem, importValItem;
      importItem.children.forEach(child => {
        if (child.constructor.name === "Dotted_nameContext") {
          fromItem = child.getText();
        }
        if (child.constructor.name === "Import_as_namesContext") {
          let terminalchildren;
          terminalchildren = this.getTerminalNodes(child);
          if (terminalchildren.length > 1) {
            importValItem = t.importSpecifier(
              t.identifier(terminalchildren.pop()),
              t.identifier(terminalchildren.shift())
            );
          } else {
            importValItem = t.importDefaultSpecifier(
              t.identifier(child.getText())
            );
          }
        }
      });
      return t.importDeclaration([importValItem], t.stringLiteral(fromItem));
    }
  }

  getIdentifier(name) {
    return t.identifier(name);
  }

  getBlockStatement(children = []) {
    return t.blockStatement(children);
  }

  visitFile_input(ctx) {
    return t.program(
      flatten(ctx.children.map(child => this.visitChildren(child)))
    );
  }

  visitAtom(ctx) {
    return t.identifier(ctx.getText());
  }

  visitTerm(ctx) {
    let context = ctx;
    if (ctx.children && ctx.children.length > 1) {
      return this.visitChildren(ctx);
    }
    if (ctx.children && ctx.children.length === 1) {
      context = ctx.children[0];
    }

    return this.getItem(context);
  }

  visitReturn_stmt(ctx) {
    const children = this.visitChildren(ctx.children[1]);
    return t.returnStatement(children[0]);
  }

  visitFuncdef(ctx) {
    const id = t.identifier(ctx.NAME().getText());
    let args = ctx
      .parameters()
      .children.filter(item => !this.isTerminalNode(item))[0];
    const params = args
      ? args
          .getText()
          .split(",")
          .map(arg => this.getIdentifier(arg))
      : [];
    const children = this.visitChildren(ctx.getChild(4));
    const funcDef = t.functionDeclaration(
      id,
      params,
      t.blockStatement(children)
    );

    return funcDef;
  }

  group(array) {
    let previousIf = -1;
    let group = [];
    for (let i = 0; i < array.length; i++) {
      const node = array[i];
      if (
        this.isTerminalNode(node) &&
        [10, 11, 12].indexOf(node.symbol.type) > -1
      ) {
        if (previousIf !== -1) {
          const subArray = array.slice(previousIf, i);
          group.push(subArray);
        }
        previousIf = i;
      }
      if (i === array.length - 1) {
        const sliceIndex = previousIf !== -1 ? previousIf : 0;
        const subArray = array.slice(sliceIndex);
        group.push(subArray);
      }
    }

    return group;
  }

  mapIfAlternates(ifArray) {
    for (let i = ifArray.length - 1; i > 0; i--) {
      const element = ifArray[i];
      const prevElement = ifArray[i - 1];
      prevElement.alternate = element;
    }
    return ifArray[0];
  }

  visitIf_stmt(ctx) {
    const children = this.group(ctx.children);
    const ifChildren = children.map(this.getIfContexts.bind(this));

    return this.mapIfAlternates(ifChildren);
  }

  visitWhile_stmt(ctx) {
    const children = [];
    let test;

    ctx.children.forEach(child => {
      if (child.constructor.name === "TestContext") {
        test = t.identifier(child.getText());
      } else if (!this.isTerminalNode(child)) {
        children.push(child.accept(this));
      }
    });

    return t.whileStatement(test, t.blockStatement(flatten(children)));
  }

  visitFor_stmt(ctx) {
    let contexts = ctx.children.filter(item => !this.isTerminalNode(item));
    let left = this.visitChildren(contexts.shift())[0];
    let right = this.visitChildren(contexts.shift())[0];
    let body = [];
    contexts.forEach(child => {
      body.push(this.visitChildren(child));
    });

    return t.forInStatement(left, right, t.blockStatement(flatten(body)));
  }

  visitRaise_stmt(ctx) {
    return t.throwStatement(t.identifier(ctx.getText()));
  }

  getIfContexts(nodes = []) {
    let test;
    const consequents = [];
    let current;
    while (nodes.length) {
      current = nodes.shift();
      if (current.constructor.name === "TestContext") {
        test = t.identifier(current.getText());
      } else if (!this.isTerminalNode(current)) {
        consequents.push(current.accept(this));
      }
    }
    if (test) {
      return t.ifStatement(test, t.blockStatement(flatten(consequents)));
    } else {
      return t.blockStatement(flatten(consequents));
    }
  }

  visitLambdef(ctx) {
    let args, body;
    ctx.children.forEach(child => {
      if (!this.isTerminalNode(child)) {
        if (child.constructor.name === "VarargslistContext") {
          args =
            child
              .getText()
              .split(",")
              .map(arg => this.getIdentifier(arg)) || [];
        } else {
          body = this.visitChildren(child);
        }
      }
    });

    return t.arrowFunctionExpression(args, body[0]);
  }

  isTerminalNode(node) {
    return node.constructor.name === "TerminalNodeImpl";
  }

  visitArith_expr(ctx) {
    return t.identifier(ctx.getText());
  }

  visitNumber(ctx) {
    return t.numericLiteral(parseInt(ctx.getText().trim()));
  }
}

exports.CustomVisitor = CustomVisitor;
