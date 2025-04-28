//编写一个函数，传入两个int参数，在函数创建一个结构体point类型的变量，将传入的两个参数分别赋值给该结构体变量的x和y,最后将该结构体返回

struct point 
{
    int x;
    int y;
};

struct  point createPoint(int x,int y)
{
    struct point temp ;
    temp.x = x;
    temp.y = y;
    return temp;
    /* data */
};

int main()
{
    struct point *p
    p = createPoint(1,2);
    printf("%d %d",p.x,p.y);
    return 0;
}