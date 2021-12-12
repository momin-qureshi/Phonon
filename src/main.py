from os import listdir, getcwd

ext = ['.jpg', '.png']
    

def getImages():
    return[img for img in listdir(getcwd()) if any(x in img for x in ext)]
