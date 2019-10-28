from models.utils.utils import num_flat_features
from models.networks.custom_layers import Upscale2d

# for demo vis => generate 2d dummy data
def write_demo_data(n_samples, output_dir):
    import numpy as np
    import os
    data = np.random.randn(n_samples, 2)
    
def netG_slow_forward(netG, x):
    interm_results = []
    
    ## Normalize the input ?
    if netG.normalizationLayer is not None:
        x = netG.normalizationLayer(x)
        # interm_results.append([x, 'normalization'])
    x = x.view(-1, num_flat_features(x)) #flatten input?
    # interm_results.append([x, 'flatenning'])
    
    # format layer
    x = netG.leakyRelu(netG.formatLayer(x))
    # interm_results.append([x, 'format1'])
    x = x.view(x.size()[0], -1, 4, 4) # reshape
    x = netG.normalizationLayer(x)
    interm_results.append([x, 'format_layer'])
    
    # Scale 0 (no upsampling)
    i = 0
    for convLayer in netG.groupScale0:
        x = netG.leakyRelu(convLayer(x))
        if netG.normalizationLayer is not None:
            x = netG.normalizationLayer(x)
        interm_results.append([x, f'scale0_{i}'])
        i += 1
        
    # Dirty, find a better way
    if netG.alpha > 0 and len(netG.scaleLayers) == 1:
        y = netG.toRGBLayers[-2](x)
        y = Upscale2d(y)
        interm_results.append([x, 'scale1'])

    # Upper scales
    for scale, layerGroup in enumerate(netG.scaleLayers, 0):

        x = Upscale2d(x)
        # interm_results.append([x, f'upper_scales-{scale}'])
        
        conv_n = 0
        for convLayer in layerGroup:
            x = netG.leakyRelu(convLayer(x))
            if netG.normalizationLayer is not None:
                x = netG.normalizationLayer(x)
                
            interm_results.append([x, f'upper_scales_{scale}_{conv_n}'])
            conv_n += 1


        if netG.alpha > 0 and scale == (len(netG.scaleLayers) - 2):
            y = netG.toRGBLayers[-2](x)
            y = Upscale2d(y)

            interm_results.append([y, f'upper_scales_{scale}_y'])

    # To RGB (no alpha parameter for now)
    x = netG.toRGBLayers[-1](x)
    interm_results.append([x, 'x_toRGB'])

    # Blending with the lower resolution output when alpha > 0
    if netG.alpha > 0:
        x = netG.alpha * y + (1.0-netG.alpha) * x
    interm_results.append([x, 'blending'])
        
    if netG.generationActivation is not None:
        x = netG.generationActivation(x)
    interm_results.append([x, 'final_output'])
    for item in interm_results:
        item[0] = item[0].detach().numpy()

    return interm_results

