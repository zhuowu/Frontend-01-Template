//https://html.spec.whatwg.org/multipage/parsing.html#data-state
//https://html.spec.whatwg.org/multipage/parsing.html#tagopen-state
//https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inselect

let currentToken = null;
let currentAttribute = null; //属性节点
//创建一个栈，默认塞一个document元素，作为总的父节点
//任何元素的父元素是它入栈前的栈顶
let stack = [{type: "document", children: []}];  
//文本节点
let currentTextNode = null;

function emit(token) {
  if(token.type === "text") {
    return ;
  }
  let top = stack[stack.length - 1];  //取栈顶
  if(token.type == "startTag") {
    let element = {  //新入的element，一定是栈顶的子元素
      type: "element",
      children: [],
      attributes: []
    };
    element.tagName = token.tagName;
     
    for(let p in token) {
      if(p != "type" && p != "tagName") {
        element.attributes.push({
          name: p,
          value: token[p]
        });
      }
    }
    top.children.push(element);  //将新的element加到栈顶元素的子元素中去
    element.parent = top;  //再把新加的元素的parent设置为栈顶

    if(!token.isSelfClosing) {
      stack.push(element);  //如果不是自封闭标签，就将它入栈
    }
    currentTextNode = null;
  } else if(token.type == "endTag") {
    if(top.tagName != token.tagName) {
      throw new Error("Tag start end doesn't match!");
    } else {
      stack.pop();  //删除数组最后一个元素
    }
    currentTextNode = null;
  } else if(token.type == "text") {
    //如果当前没有文本节点，我们就创建一个
    if(currentTextNode == null) {
      currentTextNode = {
        type: "text",
        content: ""
      };
      top.children.push(currentTextNode);
    }
    //如果当前有文本节点，我们就把token的内容追加到文本节点上
    currentTextNode.content += token.content;
  }
}

const EOF = Symbol("EOF"); //EOF: end of file

function data(c) {
  if(c == "<") {
    return tagOpen;  //有三种tag，开始标签，结束标签，自封闭标签
  } else if(c == EOF) {
    emit({
      type: "EOF"
    });
    return ;
  } else {
    emit({
      type: "text",
      content: c
    });
    return data;
  }
}

function tagOpen(c) {
  if(c == "/") {
    return endTagOpen;
  } else if(c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "startTag",
      tagName: ""
    };
    return tagName(c);
  } else {
    return ;
  }
}

function endTagOpen(c) {
  if(c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "endTag",
      tagName: ""
    };
    return tagName(c);
  } else if(c == ">") {

  } else if(c == EOF) {
     
  }
}

function tagName(c) {
  if(c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if(c == '/') {
    return selfClosingStartTag;
  } else if(c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c;//正经的话，应该再 toLowerCase()
    return tagName;
  } else if(c == ">"){
    emit(currentToken);
    return data;
  } else {
    currentToken.tagName += c;
    return tagName;
  }
}

function beforeAttributeName(c) {
  if(c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if(c.match(/^[\n\t\f ]$/) || c == "/" || c == ">" || c == EOF) {
    return afterAttributeName(c);
  } else if(c == "=") {
   //抛错

  } else {
    //创建属性节点
    currentAttribute = {
      name: "",
      value: ""
    };
    return attributeName(c);
  }
}

function attributeName(c) {
  if(c.match(/^[\n\t\f ]$/) || c == "/" || c == ">" || c == EOF) {
    return afterAttributeName(c);
  } else if(c == "=") {
    return beforeAttributeValue;
  } else if(c == "\u0000") {

  } else if(c == "\"" || c == "'" || c == "<") {

  } else {
    currentAttribute.name += c;
    return attributeName;
  }
}

function beforeAttributeValue(c) {
  if (c.match(/^[\n\t\f ]$/) || c == "/" || c == ">" || c == EOF) {
    return beforeAttributeValue;
  } else if(c == "\"") {
    return doubleQuotedAttributeValue;
  } else if(c == "\'") {
    return singleQuotedAttributeValue;
  } else if(c == ">") {
    //return data
  } else {
    return UnquoedAttributeValue(c);
  }
}

function doubleQuotedAttributeValue(c) {
  if(c == "\"") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if(c == "\u0000") {
 
  } else if( c== EOF) {

  }else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(c) {
  if(c == "\'") {
    currentAttribute[currentAttribute.name] = currentToken.value;
    return afterQuotedAttributeValue;
  } else if(c == "\u0000") {

  } else if(c == EOF) {

  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function afterQuotedAttributeValue(c) {
  if(c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if(c == "/") {
    return selfClosingStartTag;
  } else if(c == ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if( c == EOF) {

  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function UnquoedAttributeValue(c) {
  if(c.match(/^[\t\n\f ]$/)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if(c == "/") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if(c == ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if(c == "\u0000") {

  } else if(c == "\"" || c == "'" || c == "<" || c == "=" || c == "`") {

  } else if(c == EOF) {

  } else {
    currentAttribute.value += c;
    return UnquoedAttributeValue;
  }
}

function selfClosingStartTag(c) {
  if(c == ">") {
    currentToken.isSelfClosing = ture;
    emit(currentToken);
    return data;
  } else if(c == "EOF") {

  } else {

  }
}


module.exports.parseHTML = function parseHTML(html) {
  let state = data;
  for(let c of html) {
    state = state(c);
  }
  state = state(EOF);
  return stack[0];
};


 
/* module.exports.parseHTML = function parseHTML(html) {
  console.log(html);
}; */