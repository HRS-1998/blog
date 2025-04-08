#include<stdio.h>
#include<string.h>

int main(int argc, char const *argv[]){
    char str2[11];
    strcpy(str2, "HelloWorld");
    printf("%s\n", str2);
    printf("%zu\n",sizeof(3.14));
    return 0;
}