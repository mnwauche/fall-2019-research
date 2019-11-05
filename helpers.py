from models.utils.utils import num_flat_features
from models.networks.custom_layers import Upscale2d

# for demo vis => generate 2d dummy data
def write_demo_data(n_samples, output_dir):
    import numpy as np
    import os
    data = np.random.randn(n_samples, 2)
    
# FIX => change ordering of interm results input
def netG_forward(netG, x):
    interm_results = []
    
    interm_results.append(['input', x])
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

    # remove results from graph
    for item in interm_results:
        item[0] = item[0].detach().numpy()

    return interm_results

 def netD_forward(netD, x):
        # (key, value)
        results = []

        # Alpha blending
        if netD.alpha > 0 and len(netD.fromRGBLayers) > 1:
            y = F.avg_pool2d(x, (2, 2))
            y = netD.leakyRelu(netD.fromRGBLayers[- 2](y))
            results.append(['alpha_blending', y])

        # From RGB layer
        x = netD.leakyRelu(netD.fromRGBLayers[-1](x))
        results.append(['from_rgb', x])

        # Caution: we must explore the layers group in reverse order !
        # Explore all scales before 0
        mergeLayer = netD.alpha > 0 and len(netD.scaleLayers) > 1
        shift = len(netD.fromRGBLayers) - 2
        for group_idx, groupLayer in enumerate(reversed(netD.scaleLayers)):

            for layer in groupLayer:
                x = netD.leakyRelu(layer(x))

            x = nn.AvgPool2d((2, 2))(x)
            results.append([f'group_{group_idx}_avgPool', x])

            if mergeLayer:
                mergeLayer = False
                x = netD.alpha * y + (1-netD.alpha) * x
                results.append([f'group_{group_idx}_mergLayer', x])

            shift -= 1

        # Now the scale 0

        # Minibatch standard deviation
        if netD.miniBatchNormalization:
            x = miniBatchStdDev(x)

        x = netD.leakyRelu(netD.groupScaleZero[0](x))

        x = x.view(-1, num_flat_features(x))
        x = netD.leakyRelu(netD.groupScaleZero[1](x))

        out = netD.decisionLayer(x) 

        results.append(['decisionLayer', out])

        # remove results from graph
        for item in interm_results:
            item[1] = item[1].detach().numpy()

        return results

 # generating / saving feature map samples
 def publish_samples(netG, netD, noise):
    SAMPLES_DIR = 'pgan_vis/sample_imgs/'
    samples = [netG_forward(netG, noise), netD_forward(netD, noise)]

    # get feature maps => layerData in netData in dataGroups
    from sklearn.manifold import TSNE
    dataGroups = [[netG[i][0] for i in range(len(samples[0]))], [netD[i][0] for i in range(len(samples[1]))]]

    # get list of layer-names (excluding output layer)
    layers = [sample_gs[i][1] for i in range(len(netData)-1) for netData in dataGroups]
    imgLayerData = dataGroups[-1]

    # flatten except output layer
    # group by layer for numpy array, flatten by sample for...
    flatDataGroups = [[], []]
    for netData in dataGroups:
        notFlatNetData = [netData[:len(net_data)-1] # exclude output layer 
        newNetData = []
        flatLayerData = [np.array([sample.flatten().copy() for sample in layerData for layerData in netData])) for layerData in netData]
        newLayerData = np.array()
        flatDataGroups.append(newNetData)

    # reduce dimensions using TSNE
    rdDataGroups = [[TSNE(n_components=2).fit_transform(samples).copy() for layerData in netData] for netData in flatDataGroups]
    out = []

    # item() => from numpy float to float
    for i in range(n_samples):
        sample = {'path': f'sample{i}.png'}
        for i, netData in enumerate(rdDataGroups):
            for j, layer in enumerate(layers):
            sample[f'{layer}'] = {'tsne1': rdMapDatagroupList[j][i][0].item(), 'tsne2': rdMapDatagroupList[j][i][1].item()}
        out.append(sample)

    # save last layer to img directory
    from PIL import Image
    for i, image in enumerate(out_imgs):
        img = Image.fromarray(np.uint8(np.moveaxis(image, 0, -1)*255)) 
        # change from channels first to channels last
        img.save(SAMPLES_DIR + f'sample{i}.png')

    # write samples to json file
    with open('pgan_vis/g_samples.json', 'w') as f_json:
        json.dump(out, f_json)


