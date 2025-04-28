# 一些浅显有关 c 语言的知识

数据类型对应的字节数

| 数据类型    | 32 位系统 | 64 位系统 (Linux/macOS) | Windows 系统 |
| ----------- | --------- | ----------------------- | ------------ |
| char        | 1         | 1                       | 1            |
| short       | 2         | 2                       | 2            |
| int         | 4         | 4                       | 4            |
| long        | 4         | 8                       | 4            |
| long long   | 8         | 8                       | 8            |
| float       | 4         | 4                       | 4            |
| double      | 8         | 8                       | 8            |
| long double | 12        | 16                      | 8            |
| 指针类型    | 4         | 8                       | 8（x64）     |

c 的占位符

| 数据类型           | 输入(scanf) | 输出(printf) | 特殊说明              |
| ------------------ | ----------- | ------------ | --------------------- |
| signed char        | %c          | %c           |                       |
| unsigned char      | %hhu        | %hhu         | 原%c 容易产生类型歧义 |
| short              | %hd         | %hd          |                       |
| unsigned short     | %hu         | %hu          |                       |
| int                | %d          | %d           |                       |
| unsigned int       | %u          | %u           |                       |
| long               | %ld         | %ld          |                       |
| unsigned long      | %lu         | %lu          |                       |
| long long          | %lld        | %lld         |                       |
| unsigned long long | %llu        | %llu         |                       |
| float              | %f          | %f           |                       |
| double             | %lf         | %f           | 输出时不区分%f/%lf    |
| long double        | %Lf         | %Lf          | 必须大写 L            |
| size_t             | %zu         | %zu          | 原生无符号类型        |
| 指针类型           | %p          | %p           | 需要(void\*)强制转换  |

类型修饰符影响

| 修饰符组合  | 典型示例     | 取值范围                   |
| ----------- | ------------ | -------------------------- |
| signed      | signed char  | -128 ~ 127                 |
| unsigned    | unsigned int | 0 ~ 4,294,967,295          |
| short + int | short int    | -32,768 ~ 32,767           |
| long + int  | long int     | -2^31 ~ 2^31-1 (32 位系统) |

b 指针的声明

```c
int *p; // 声明一个指向 int 类型的指针


```

`指针做算数运算`

给指针加上一个整数，实际上加的是这个整数和指针数据类型对应字节数的乘积

```c
#include<stdio.h>
int main(){
int a =5;
int *p = &a;
printf("%p\n",p);
//0061FF18
p++;
printf("%p\n",p);
//0061FF1C
return 0;
}
// p++  ---> p=p+1--->p=p+1*4
// p++  ---> p=p+1--->p=p+1*sizeof(int)

```

`结构体的声明`
结构体是一个或多个变量的集合，这些变量可以是不同的类型, 类似于 java 中的类（去掉方法）
struct 结构体名称{
数据类型 变量名;
数据类型 变量名;
...
}

```c
struct point{
    int x;
    int y;
}
// 使用
struct point p;
p.x=1;
p.y=2;
```

`结构体与指针`

```c
// pp指向一个pint结构体
struct point *pp

// 为pp所指向的结构体中的变量赋值
// (*pp).x = 1;
// (*pp).y = 2;
pp->x = 1;
pp->y = 2;

```
