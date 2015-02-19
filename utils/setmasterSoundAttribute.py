import json

waysPath = "../content/ways.json"

ways_data = open(waysPath)

ways = json.load(ways_data)

#FOR each translation
for way in ways:
    if way.get("waySounds"):
        way["waySoundsMaster"] = True
    else:
        way["waySoundsMaster"] = False

with open('../content/waymodified.json', 'w') as outfile:
    json.dump(ways, outfile)
