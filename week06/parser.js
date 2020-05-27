//https://html.spec.whatwg.org/multipage/parsing.html#data-state
//https://html.spec.whatwg.org/multipage/parsing.html#tagopen-state
//https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inselect
const css = require('css');

const EOF = Symbol("EOF"); //EOF: end of file

let currentToken = null;
let currentAttribute = null; //属性节点
//创建一个栈，默认塞一个document元素，作为总的父节点
//任何元素的父元素是它入栈前的栈顶
let stack = [{type: "document", children: []}];  
//文本节点
let currentTextNode = null;

//第一步
//加入一个新的函数，addCSSRules，这里我们把CSS规则暂存到一个数组里
let rules = [];
function addCSSRules(text) {
  var ast = css.parse(text);
  rules.push(...ast.stylesheet.rules); //把数组展开，当作参数传进rules中
}

//匹配算法
function match(element, selector) {
  if(!selector || !element.attributes) {
    return false;
  }
  if(selector.charAt(0) == "#") {
    var attr = element.attributes.filter(attr => attr.name === "id")[0];
    if(attr && attr.value === selector.replace("#", "")) {
      return true;
    }
  } else if(selector.charAt(0) == ".") {
    var attr = element.attrbutes.filter(attr => attr.name === "class")[0];
    if(attr && attr.value === selector.replace(".", "")) {
      return true;
    }
  } else {
    if(element.tagName === selector) {
      return true;
    }
  }
  return false;
}

//不支持复合selector（例如 a.x#y ），需要用正则再拆一层
//可选作业：实现复合selector
function specificity(selector) {
  var p = [0, 0, 0, 0];  //这个数组就是表达：[0, id, calss, tagName] 左边高右边低
  var selectorParts = selector.split(" ");
  for(var part of selectorParts) {
    //实现复合选择器，在此处用正则把 part拆开成简单选择器，再用一次循环就可以了
    /* 复合选择器的代码 */
    if(part.charAt(0) == "#") {
      p[1] += 1; 
    } else if(part.charAt(0) == ".") {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}

function compare(sp1, sp2) {
  if(sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  }
  if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  }
  if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }
  return sp1[3] - sp2[3];
}

//第二步，在真实浏览器中，可能遇到写在body中的style标签，我们这里忽略
//refolw，重排或重绘。重排一定触发重绘，重绘也会触发重排。first render时，一旦在尾巴上放了一个style标签，之前都白费，页面会闪动。
//所以我们尽可能把style标签写在所有元素之前，防止重绘。
function computeCSS(element) {
  //获取父元素序列，直接从栈中取。clice不传参数，返回值就是当前数组，就是相当于复制一份当前数组
  //reverce，反转数组，是因为我们首先获取的是当前元素，所以我们获得和计算父元素匹配的顺序是从内向外
  var elements = stack.slice().reverse(); 
  if(!element.computedStyle) {
    element.computedStyle = {};
  }

  for(let rule of rules) {
    var selectorParts = rule.selectors[0].split(" ").reverse();  //为了和elements顺序一致，将rule也serverse

    if(!match(element, selectorParts)){
      continue;
    }

    let matched = false;//匹配结果
    var j = 1;  //用 j 来表示每一个selector
    for(var i = 0; i < elements.length;i++) {  //用 i 来表示每一个elements
      if(macth(elements[i]), selectorParts[j]) {  //如果elements和selector匹配，就 让selector往前走一格
        j++;
      }
    }
    if(j >= selectorParts.length) {  //表示匹配是成功的，我们就matched = true
      matched = true;
    }
    if(matched) {
      //如果匹配到，我们要加入
      //console.log("Element", element, "matched rule", rule);
      var sp = specificity(rule.selectors[0]);
      var computedStyle = element.computedStyle;
      for(var declaration of rule.declarations) {
        if(!computedStyle[declaration.property]) {
          computedStyle[declaration.property] = {}; //因为后面考虑到有优先级，所以在这里预留了一个对象
        }
        if (!computedStyle[declaration.property].specificity) {
          computedStyle[declaration.property].value = declaration.value;  //把declaration.value存到上面对象的value中
          computedStyle[declaration.property].specificity = sp;
        } else if(compare(computedStyle[declaration.property].specificity, sp) < 0 ) {  //比较优先级
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        }
      }
      //console.log(element.computedStyle);
    }
  }
  
}

function emit(token) {
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
    //创建元素和把tagName和属性都加好之后，就调用这个computeCSS方法，这个方法为什么放在这里，原理很重要
    computeCSS(element);  //有一个element创建的过程，就有一个CSS compute的过程
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
      //==================遇到style标签时，执行添加CSS规则的操作=====================
      if(top.tagName === "style") {  //进栈的top一定是一个element
        addCSSRules(top.children[0].content); //CSs规则的收集
      }
      //为什么要在pop阶段执行CSS的收集？
      //因为在push的时候，style标签的子元素，也就是那个文本节点，还没有被挂载到style标签上，所有这个时候style标签的子元素是空的
      //如果我们在pop之前去处理标签，我们就可以取到它的children
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
    currentToken.tagName += c;//正经的话，应该再 c.toLowerCase()
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