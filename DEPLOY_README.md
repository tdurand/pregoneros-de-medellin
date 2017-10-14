-> do modif on master
-> branch clever, rebase master (this Change still to point to images.pregonerosdemedellin.com, sounds)
-> create branch prod from here , to delete after, and move to it
-> build css : compass compile -e production --force
-> build js: r.js -o app-build.js
-> delete app
-> rename app-build to app
-> push: git push clever todelete:master --force
-> delete branch prod created




-> do modif on now branch
-> create branch now-prod (to delete afer)
-> build js: r.js -o app-build.js
-> cd style . build css : compass compile -e production --force
-> delete app
-> rename app-build to app
-> copy to RepoProd without data / video folder
-> now
-> delete branch now-prod created
