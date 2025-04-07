#include<stdio.h>
void swap(int *a, int *b){
    int temp = *a;
    *a = *b;
    *b = temp;
    printf("a=%d,b=%d\n",*a,*b);
    printf("%zu,%zu\n",&a,&b);
      // return ;
}

int main(int argc, char const *argv[])
{
    int a = 5;
    int b=10;
    swap(&a,&b);
    printf("a=%d,b=%d",a,b);
} 