# dart 语法相关

## 基础数据类型

1. 数字类型

   - int
   - double

```dart
void main(){
double a = 2.3;
double b = 4.5;
double c = 2.5;

double avg = (a+b+c)/3;
print(avg);
}
```

2. 字符串类型
   - String
     String 中可以通过 `${表达式}` 来动态拼接字符串

```dart
void main() {
  double a = 2.3;
  double b = 4.5;
  double c = 2.5;

  double avg = (a + b + c) / 3;
  String output = '$a,$b,$c 的平均值是$avg';
  print(output);
}

---->[输出结果]----
2.3,4.5,2.5 的平均值是3.1
```

3. 布尔类型
   - bool

```dart
void main() {
  // 直接赋值
  bool enable = true;
  double height = 1.18;
  // 布尔值可以通过运算获得
  bool free = height < 1.2;
}
```

## 运算符

1. 算术运算符
   |运算符|符号|
   |:----:|:----:|
   |加法|+|
   |减法|-|
   |乘法|\*|
   |除法|/|
   |取余|%|
   |整除|~/|
2. 比较运算符
   |运算符|符号|
   |:---:|:----:|
   |等于|==|
   |不等于|!=|
   |大于|>|
   |小于|<|
   |大于等于|>=|
   |小于等于|<=|

3. 逻辑运算符
   |运算符|符号|
   |:---:|:----:|
   |逻辑与|&&|
   |逻辑或||||
   |逻辑非|!|

## 流程控制

1. 条件流程： if else
2. 条件控制： switch case
3. 循环流程： for while do while

## 函数

1. 函数声明

```dart
double bmi(double height, double wight) {
  // 具体算法
  double result = wight / (height * height);
  return result;
}
```

2. 命名参数
   有些时候，函数的参数过多，在调用时需要记清顺序，是比较麻烦的。Dart 中支持命名参数，可以通过参数的名称来传参，不需要在意入参的顺序。通过 {} 包裹命名的参数，其中 required 关键字表示该入参必须传入; 另外，可以用 = 提供参数的默认值，使用者在调用时可以选填

```dart
double bmi({
  required double height,
  double weight = 65,
}) {
  // 具体算法
  double result = weight / (height * height);
  return result;
}

void main() {
  double toly = bmi(weight: 70, height: 1.8);
  double ls = bmi(height: 1.79);
  double wy = bmi(height: 1.69, weight: 50);
}
```

3. 位置参数
   方括号 [] 包围参数列表，位置参数可以给默认
   在使用时必须要按照参数顺序传入，它和普通参数列表的区别在于：在调用时，可以省略若干个参数，省略的参数使用默认值

   ```dart
   double bmi([double height = 1.79, double weight = 65]) {
   // 具体算法
   double result = weight / (height * height);
   return result;
   }

   void main() {
   double toly = bmi(1.8,70);
   double ls = bmi();
   double wy = bmi(1.69);
   }

   ```

## 面向对象

1. 自定义数据类型
   通过 class 关键字来定义一个类型，{} 内是类的具体内容；其中可以定义若干个属性，也称之为 成员属性 。

```dart
class Human {
  String name = '';
  double weight = 0;
  double height = 0;
}

void main(){
  Human toly = Human(); // tag1
  toly.name = "捷特";
  toly.weight = 70;
  toly.height = 180;

  print("Human: name{${toly.name},weight:${toly.weight}kg,height:${toly.height}cm}");
}
```

2. 构造函数
   构造函数本身也是一个函数，它的价值在于：实例化对象时，可以对属性进行初始化。如下所示，构造函数的函数名和类名相同；参数列表就是函数的参数列表语法，不再赘述，这里是普通的参数列表传递参数；在实例化对象时，会触发函数体的逻辑，对属性进行赋值，这就是通过构造函数初始化成员属性。

```dart
class Human {
 String name = '';
 double weight = 0;
 double height = 0;

 Human(String name,double weight,double height){
   this.name = name;
   this.weight = weight;
   this.height = height;
 }
}

void main(){
  Human toly = Human("捷特",70,180);
  print("Human: name{${toly.name},weight:${toly.weight}kg,height:${toly.height}cm}");
}

```

3. 成员函数(方法)
   自定义类型中，不仅可以定义成员属性，也可以定义成员函数。一般来说，在面向对象的语言中，我们习惯于称类中的函数为 方法

4. 继承
   比如要记录的信息针对于学生，需要了解学生的学校信息，同时也可以基于身高体重计算 bmi 值。在已经有 Human 类型的基础上，可以使用关键字 extends,通过继承来派生类型。
   在 Student 类中可以定义额外的成员属性 school， 另外 super.name 语法是：在入参中为父类中的成员赋值。

   ```dart
   class Student extends Human {
   final String school;
   Student(
   super.name,
   super.weight,
   super.height, {
   required this.school,
   });
   }

   void main() {
   Student toly = Student("11", 70, 180,school: "111");
   print(toly.bmi());
   }

   ```

5. 子类覆写父类方法
   当子类中存在和父类同名的方法时，就称 子类覆写了父类的方法 ，在对象调用方法时，会优先使用子类方法，子类没有该方法时，才会触发父类方法。比如下面的代码，子类中也定义了 info 方法，在程序运行时如下：
   注: 通过 super. 可调用父类方法; 一般子类覆写方法时，加 @override 注解进行示意 (非强制)

```dart
class Student extends Human {

  // 略同...

  @override
  String info() {
    String info = super.info() + "school: $school ";
    return info;
  }

}

void main() {
  Student toly = Student("捷特", 70, 180,school: "安徽建筑大学");
  print(toly.bmi());
  print(toly.info());
}
```

## 聚合类型

- 列表 List
  `增加和插入`

  ```dart
  List<int> numList = [1,9,9,4,3,2,8];
  numList.add(10);
  numList.insert(0,49);
  print(numList);

  ---->[控制台输出]----
  [49, 1, 9, 9, 4, 3, 2, 8, 10]
  ```

  `删除`

  ```dart
  List<int> numList = [1,9,9,4,3,2,8];
  numList.removeAt(2);
  numList.remove(3);
  numList.removeLast();
  print(numList);

  ---->[控制台输出]----
  [1, 9, 4, 2]
  ```

- Map
- Set
  集合本身是没有索引概念的，所以无法通过索引来访问和修改元素，因为集合本身在数学上的概念就是无序的。它可以通过 add 方法在集合中添加元素；以及 remove 方法移除某个元素值：

  ```dart
  Set<int> numSet = {1, 9, 4};
  numSet.add(10);
  print(numSet);

  ---->[控制台输出]----
  {1, 4, 10}
  ```

集合最重要的特征是可以进行集合间的运算，这点 List 列表是无法做到的。两个集合间通过 `difference`、`union`、`intersection` 方法可以分别计算差集、并集、交集。计算的结果也是一个集合：

```dart
Set<int> a = {1, 9, 4};
Set<int> b = {1, 9, 3};
print(a.difference(b));// 差集
print(a.union(b)); // 并集
print(a.intersection(b)); // 交集

---->[控制台输出]----
{4}
{1, 9, 4, 3}
{1, 9}

```
