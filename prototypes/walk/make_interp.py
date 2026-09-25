# Generates interp/: two optical-flow in-between frames per pair of lowres stills.
# Usage: python make_interp.py  (edit WAY, N and the SRC path to the lowres stills)
import cv2, numpy as np, os, time
WAY='plazabotero-start-carabobo'; N=150
SRC=f'/mnt/project-files/samples/{WAY}/lowres/way%03d.jpg'
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'interp', WAY)
os.makedirs(OUT, exist_ok=True)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
t0=time.time()
prev=cv2.imread(SRC%0)
H,W=prev.shape[:2]; gx,gy=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
q=[cv2.IMWRITE_JPEG_QUALITY,82]
for i in range(N):
    a=prev
    cv2.imwrite(f'{OUT}/{3*i:04d}.jpg', a, q)
    if i==N-1: break
    b=cv2.imread(SRC%(i+1))
    ga,gb=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),cv2.cvtColor(b,cv2.COLOR_BGR2GRAY)
    f01=dis.calc(ga,gb,None); f10=dis.calc(gb,ga,None)
    for j,t in ((1,1/3),(2,2/3)):
        # intermediate pixel x came from a at x + t*F(1->0) and from b at x + (1-t)*F(0->1)
        wa=cv2.remap(a,gx+t*f10[...,0],gy+t*f10[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
        wb=cv2.remap(b,gx+(1-t)*f01[...,0],gy+(1-t)*f01[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
        cv2.imwrite(f'{OUT}/{3*i+j:04d}.jpg', cv2.addWeighted(wa,1-t,wb,t,0), q)
    prev=b
print(time.time()-t0, len(os.listdir(OUT)))
