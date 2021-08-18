const antlr4 = require("antlr4");
const generate = require("@babel/generator").default;
const { Python3Lexer } = require("./grammar/Python3Lexer");
const { Python3Parser } = require("./grammar/Python3Parser");
const { CustomVisitor } = require("./custom-visitor");

function toJavaScript(ast) {
  return generate(ast).code;
}

function getJsAst(input) {
  const chars = new antlr4.InputStream(input);
  const lexer = new Python3Lexer(chars);
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new Python3Parser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.file_input();
  return tree.accept(new CustomVisitor());
}

module.exports = {
  getJsAst,
  toJavaScript
};
