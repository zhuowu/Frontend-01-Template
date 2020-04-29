# 星期六笔记
# JavaScript Statement
作用域指的是代码中的范围，写代码的时候
上下文指的是用户电脑上JS引擎的这块内存，运行代码的时候
## RunTime
	1，Completion Record
		是一条记录，只有三个字段：type[normal,break,continue,return,throw],value[types],target[label]
	2，Lexical Enciorment
## 语句:
### BlockStatement  
		{}有时候就是block
### Iteration
		1,while() , 如果有return 或者 throw 就会跳出
		2,do()while()
		3,for(声明;表达式;表达式){} 本身会产生一个作用域，范围是在block之外，就是{}之外
		4,for(声明 in 表达式){}  遍历对象的可枚举属性key
		5,for(声明 of 表达式){}  遍历数组，for of 对应于=> Iterator => Generator/Array，给Object实现Generator就可以对Object使用for of
### try
		try{}catch(){}finally{}
			try后面的{}不可省略，不是block，但是也有作用域。
### 声明
	必须先声明，再使用
	有时候声明一个变量时，会进行变量提升
# JavaScript Object
		对象三要素：唯一性identifier，状态state，行为behavior
		任何一个对象都是唯一的，与它本身状态无关，所以，即便状态完全一致的两个对象，也并不相等
		我们用状态来描述对象，我们状态的改变即是行为
		在设计对象的状态和行为时，我们要遵循“行为改变状态”的原则
## Class
		两个主要流派：归类，分类
		归类，多继承是非常自然的事情，如C++
		分类，则是单继承，并且会有一个基类Object
## Prototype
		原型是一种更接近人类原始认知的描述对象的方法，我们并不试图做严谨的分类，而是采用“相似”这样的方式去描述对象。
		任何对象烬烬需要描述它自己与原型的区别即可
## Object in JavaScript
		在Javascript运行时，原生对象的描述方式非常简单，我们只需要关心原型和属性两个部分
		JavaScript用属性来同意抽象对象状态和行为，而属性分为数据属性和访问器属性
		数据属性用于描述状态，访问器属性则用于描述行为
		数据属性中如果存储函数，也可以用于描述行为
		原型链：当我们访问属性时，如果当前对象没有，则会沿着原型找原型对象是否有此名称的属性，而原型对象还有可能有原型
## Function Object
		函数对象，该对象除了一般对象的属性和原型，函数对象还有一个行为[[call]]
		我们用类似f()这样的语法把对象当作函数调用时，会访问到[[call]]这个行为，如果对应的对象没有[[call]]行为，则会报错