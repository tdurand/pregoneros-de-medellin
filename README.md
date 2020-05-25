# Pregoneros de Medellín

Read here the making of : [https://medium.com/@tibbb/how-we-created-an-immersive-street-walk-experience-with-a-gopro-and-javascript-f442cf8aa2dd](https://medium.com/@tibbb/how-we-created-an-immersive-street-walk-experience-with-a-gopro-and-javascript-f442cf8aa2dd)

# Deployment notes

Deployed auto from master

```
vercel

vercel dev
```

# Old deployment

-> do modif on now branch
-> create branch now-prod (to delete afer)
-> build js: r.js -o app-build.js
-> cd style . build css : compass compile -e production --force
-> delete app
-> rename app-build to app
-> copy to RepoProd without data / video folder
-> now
-> delete branch now-prod created