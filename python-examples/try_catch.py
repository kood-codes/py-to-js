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