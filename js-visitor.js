module.exports = function(babel) {
  return {
    visitor: {
      FunctionDeclaration({ node }) {
        let name = node.id.name;
        console.log(node.id.name);
        if (name.indexOf("_") > -1) {
          node.id.name = name
            .split("_")
            .map((part, i) => {
              if (i > 0) {
                part = part[0].toUpperCase() + part.substr(1);
              }
              return part;
            })
            .join("");
        }
      },
      CallExpression({ node }) {
        if (node.callee.name === "print") {
          node.callee.name = "console.log";
        }
      }
    }
  };
};
