# Progressive growing of the GANS

-cd to pytorch_GAN_zoo-master


-prep cifar-10 for traning:

python datasets.py cifar10 $PATH_TO_CIFAR10 -o $OUTPUT_DATASET


-activate visdom server before training:

python -m visdom.server


python train.py PGAN -c config_cifar10.json --restart -n cifar10