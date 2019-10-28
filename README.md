# Progressive growing of the GANS

-activate visdom server before training:
    python -m visdom.server

-pgan, save every 200
    python train.py PGAN -c config_cifar10.json -n cifar10 -s 200

-demo visualization
    python -m http.server
    -navigate to: http://localhost:8000/pgan_vis/

-to do Week 12/28 - 11/2
    -interactivity on demo viz
        -distance heatmap on select
        -simultaenous selection on different layers

    -loss function for evaluating distance between samples