function plot_it()  {

    // imgPath use => sample_imgs/imgPath
    //global layout parameters
    var pad = 40;
    // var enlarged_scatter_width, enlarged_scatter_height = 520;
    // small_scatter_height = 100;
    var svg_width = 900, svg_height = 900;
    var mark_size_small = 0.5, mark_size_large = 7.0;

    //group data by layer
    var layers = ["format_layer", "scale0_0", "scale1", "upper_scales_0_0", "upper_scales_0_1", "x_toRGB", "blending"]
    var layer_band_scale = d3.scaleBand().domain(layers.reverse()).range([pad, svg_width - pad]).paddingInner(0.2)


    var by_layer_data = [], layer_scales = {}
    layers.forEach(layer => {
        var layer_data = {}
        layer_data.key = layer
        layer_data.values = []
        g_sample_data.forEach(sample => {
            layer_data.values.push({'path': sample.path, 'tsne1': sample[layer]['tsne1'], 'tsne2': sample[layer]['tsne2']})
        })
        by_layer_data.push(layer_data)
        var tsne1_min = d3.min(layer_data.values.map(d => d.tsne1))
        var tsne2_min = d3.min(layer_data.values.map(d => d.tsne2))

        var tsne1_max = d3.max(layer_data.values.map(d => d.tsne1))
        var tsne2_max = d3.max(layer_data.values.map(d => d.tsne2))

        // x, y
        var tsne1_scale = d3.scaleLinear().domain([tsne1_min, tsne1_max]).range([0, layer_band_scale.bandwidth()])
        var tsne2_scale = d3.scaleLinear().domain([tsne2_min, tsne2_max]).range([layer_band_scale.bandwidth(), 0])


        layer_scales[layer] = {'tsne1': tsne1_scale,'tsne2': tsne2_scale}
    })

    d3.select('body').append('svg').attr('width', svg_width).attr('height', svg_height);

    //generator
    var layer_scale = d3.scaleBand().domain(layers.reverse()).range([pad, svg_width - pad]).paddingInner(0.25)
    d3.select('svg').append('g').attr('transform', 'translate('+(pad)+','+(pad)+')').attr('id', 'generator')

    d3.select('#generator').selectAll('layers').data(by_layer_data).enter()
    .append('g')
        .attr('transform', d => 'translate('+layer_scale(d.key)+',0)')
    .append('rect') 
        .attr('fill', '#e6daaa') //background fill for plots
        .attr('opacity', '0.3')
    .selectAll('layers').data(layer_data => {
        return layer_data.values.map(sample => {
            sample.key = layer_data.key // add key for accessing scale
            return sample
        })
    })
    .enter()
    .append('rect')
        .attr('x', d => layer_scales[d.key].tsne1(d.tsne1))
        .attr('y', d => layer_scales[d.key].tsne1(d.tsne1))
        .attr('fill', 'gray').attr('width', mark_size_small)
        .attr('height', mark_size_small) // to do: add images and interactivity

    //interactivty: 
    //  distance heatmap on select
    //  add simultaneous selection across different layers
    //  enlarge when hovered, highlight on click
    //
    // add feature maps enlarge on select
}