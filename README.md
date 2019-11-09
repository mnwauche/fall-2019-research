# Title

## Usage
### Training the model (Progressive GAN)
- Activate visdom server before training to monitor progress:
    - python -m visdom.server

- Train PGAN, save model every <S> batches (batch size 16)
    - python train.py PGAN -c config_cifar10.json -n cifar10 -s <S>

### Visualization
- Activate the web server: '''python -m http.server'''
- navigate to http://localhost:8000/pgan_vis/


## To do
- 11-3 - 11-9
    - input plot; 
    - colormap for all netG and netD layers based on input plot
    - discriminator layers; colormap;

- 11-10 - 11-16:
    - interactivity:
        - distance heatmap on select
        - simultaenous selection on different layers
    - loss function for evaluating distance between samples