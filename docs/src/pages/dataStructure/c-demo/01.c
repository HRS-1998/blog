#include<stdio.h>

int main()
{

int a =5;
int *p = &a;
printf("%p\n",p);
p++;
printf("%p\n",p);
return 0;
}



