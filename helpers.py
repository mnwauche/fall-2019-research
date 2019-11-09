from models.utils.utils import num_flat_features
from models.networks.custom_layers import Upscale2d

def netG_forward(netG, x):
    interm_results = []
    interm_results.append({'key': 'input', 'values': x})

    ## Normalize the input ?
    if netG.normalizationLayer is not None:
        x = netG.normalizationLayer(x)
        # interm_results.append([x, 'normalization'])
    x = x.view(-1, num_flat_features(x)) # flatten input?
    # interm_results.append([x, 'flatening'])
    
    # format layer
    x = netG.leakyRelu(netG.formatLayer(x))
    # interm_results.append([x, 'format1'])
    x = x.view(x.size()[0], -1, 4, 4) # reshape
    x = netG.normalizationLayer(x)
    interm_results.append({'key': 'format_layer', 'values': x})
    
    # Scale 0 (no upsampling)
    i = 0
    for convLayer in netG.groupScale0:
        x = netG.leakyRelu(convLayer(x))
        if netG.normalizationLayer is not None:
            x = netG.normalizationLayer(x)
        interm_results.append({'key': f'scale0_{i}', 'values': x})
        i += 1
        
    # Dirty, find a better way
    if netG.alpha > 0 and len(netG.scaleLayers) == 1:
        y = netG.toRGBLayers[-2](x)
        y = Upscale2d(y)
        interm_results.append({'key': 'scale1', 'values': x})

    # Upper scales
    for scale, layerGroup in enumerate(netG.scaleLayers, 0):

        x = Upscale2d(x)

        conv_n = 0
        for convLayer in layerGroup:
            x = netG.leakyRelu(convLayer(x))
            if netG.normalizationLayer is not None:
                x = netG.normalizationLayer(x)
                
            interm_results.append({'key': f'upper_scales_{scale}_{conv_n}', 'values': x})
            conv_n += 1


        if netG.alpha > 0 and scale == (len(netG.scaleLayers) - 2):
            y = netG.toRGBLayers[-2](x)
            y = Upscale2d(y)

            interm_results.append({f'upper_scales_{scale}_y': y})

    # To RGB (no alpha parameter for now)
    x = netG.toRGBLayers[-1](x)
    interm_results.append({'key': 'x_toRGB', 'values': x})

    # Blending with the lower resolution output when alpha > 0
    if netG.alpha > 0:
        x = netG.alpha * y + (1.0-netG.alpha) * x
    interm_results.append({'key': 'blending', 'values': x})
        
    if netG.generationActivation is not None:
        x = netG.generationActivation(x)
    interm_results.append({'key': 'netG_output', 'values': x})

    # remove results from graph
    for item in interm_results:
        item['net'] = 'G'
        item['values'] = item['values'].detach().numpy()

    return interm_results

def netD_forward(netD, x):
    import torch.nn as nn
    import torch.nn.functional as F
    from models.networks.mini_batch_stddev_module import miniBatchStdDev

    # (key, value)
    results = []

    # Alpha blending
    if netD.alpha > 0 and len(netD.fromRGBLayers) > 1:
        y = F.avg_pool2d(x, (2, 2))
        y = netD.leakyRelu(netD.fromRGBLayers[- 2](y))
        results.append({'key': 'alpha_blending', 'values': y})

    # From RGB layer
    x = netD.leakyRelu(netD.fromRGBLayers[-1](x))
    results.append({'key': 'from_rgb', 'values': x})

    # Caution: we must explore the layers group in reverse order !
    # Explore all scales before 0
    mergeLayer = netD.alpha > 0 and len(netD.scaleLayers) > 1
    shift = len(netD.fromRGBLayers) - 2
    for group_idx, groupLayer in enumerate(reversed(netD.scaleLayers)):

        for layer in groupLayer:
            x = netD.leakyRelu(layer(x))

        x = nn.AvgPool2d((2, 2))(x)
        results.append({'key': f'group_{group_idx}_avgPool', 'values': x})

        if mergeLayer:
            mergeLayer = False
            x = netD.alpha * y + (1-netD.alpha) * x
            results.append({'key': f'group_{group_idx}_mergLayer', 'values': x})

        shift -= 1

    # Now the scale 0

    # Minibatch standard deviation
    if netD.miniBatchNormalization:
        x = miniBatchStdDev(x)

    x = netD.leakyRelu(netD.groupScaleZero[0](x))

    x = x.view(-1, num_flat_features(x))
    x = netD.leakyRelu(netD.groupScaleZero[1](x))

    out = netD.decisionLayer(x) 

    results.append({'key': 'decisionLayer', 'values': out})

    # remove results from graph
    for item in results:
        item['net'] = 'D'
        item['values'] = item['values'].detach().numpy()

    return results

# generating / saving feature map samples
def publish_samples(netG, netD, noise):
    import torch
    import numpy as np
    import json
    SAMPLES_DIR = 'pgan_vis/sample_imgs/'
    netG_output = netG_forward(netG, noise)
    netD_output = netD_forward(netD, torch.tensor(netG_output[-1]['values']))

    from sklearn.manifold import TSNE

    samples = [netG_output, netD_output]
    layerData = []
    for net, netData in enumerate(samples):
        for layer_data in netData:
            layerData.append(layer_data)
    imgLayerValues = np.array([x for x in layerData if x['key'] == 'netG_output'][0]['values'])
    print(f'IMAGE LAYER DATA SHAPE: {imgLayerValues.shape}')


    # reduce dim using TSNE
    for data in layerData:
        if data['key'] == 'netG_samples': # exclude output layer for netG
            pass
        else:
            flat_vals = np.array([sample.flatten().copy() for sample in data['values']]) # flatten each sample
            reduced_vals = TSNE(n_components=2).fit_transform(flat_vals).copy()
            reduced_vals = [{'path': f'sample{index}.png', 'tsne1': val[0].item(), 'tsne2': val[1].item()} for index, val in enumerate(reduced_vals)]
            data['values'] = reduced_vals
                
    # save netG output to img directory
    from PIL import Image
    for i, image in enumerate(imgLayerValues):
        img = Image.fromarray(np.uint8(np.moveaxis(image, 0, -1)*255)) 
        # change from channels first to channels last
        img.save(SAMPLES_DIR + f'sample{i}.png')

    # write samples to json file
    with open('pgan_vis/samples.json', 'w') as f_json:
        json.dump(layerData, f_json)


