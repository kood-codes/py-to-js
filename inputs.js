var input1 = `
def double(n, m, o):
  return 2 * n + m + o
`;

var input2 = `print("Incorrect input")`;

var input3 = `
def Fibonacci(n): 
    x = 5
    y = "John"
    thislist = ["apple", "banana", "cherry"]
    if n<0:
        print("Incorrect input") 
    # First Fibonacci number is 0 
    elif n==1: 
        return 0
    # Second Fibonacci number is 1 
    elif n==2: 
        return 1
    else: 
        return Fibonacci(n-1)+Fibonacci(n-2) 
`;

let input4 = `
def while_func(n):
  i = 1
  while i < 6:
    print(i)
    i += 1
`;

let input5 = `
def for_func(n):
  fruits = ["apple", "banana", "cherry"]
  for x in ('y', 'ye', 'yes'):
    print(x)
`;

let input6 = `
def ask_ok(prompt, retries=4, reminder='Please try again!'):
    while True:
        ok = input(prompt)
        if ok in ('y', 'ye', 'yes'):
            return True
        if ok in ('n', 'no', 'nop', 'nope'):
            return False
        retries = retries - 1
        if retries < 0:
            raise ValueError('invalid user response')
        print(reminder)
`;

const input7 = `
def myfunc(n):
  x = lambda a, b, c : a + b + c
  return lambda a : a * n
`;

const input8 = `
def dict_func(n):
  thisdict =	{
    "brand": "Ford",
    "model": "Mustang",
    "year": 1964
  }
  print(thisdict)
`;

const input9 = `
def try_func():
  try:
    f = open("demofile.txt")
    f.write("Lorum Ipsum")
  except NameError:
    print("Variable x is not defined")
  except ValueError:
    print("Value x is not defined")
  except:
    print("Something went wrong when writing to the file")
    print("Something went wrong when writing to the file")
    print("Something went wrong when writing to the file")
  else:
    print("else block")
  finally:
    f.close()
`;

const input10 = `
import os
from datetime import time as t
import calendar as c
class Rectangle(Shape):
  def __init__(self, length, breadth, unit_cost=0):
      self.length = length
      self.breadth = breadth
      self.unit_cost = unit_cost
  def get_area(self):
       return self.length * self.breadth
  def calculate_cost(self):
      area = self.get_area()
      return area * self.unit_cost
# breadth = 120 units, length = 160 units, 1 sq unit cost = Rs 2000
r = Rectangle(160, 120, 2000)
print("Area of Rectangle: %s sq units" % (r.get_area()))
`;

exports.inputs = [
  input1,
  input2,
  input3,
  input4,
  input5,
  input6,
  input7,
  input8,
  input9,
  input10
];
