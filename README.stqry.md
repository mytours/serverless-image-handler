## Building and releasing for STQRY

Run this on a Linux amd64 machine or VM. Arm Macs won't work.

1. Determine versions

   * Browse to the source of released version of `serverless-image-handler` you want, e.g. `6.3.2`.
   * In that version of serverless-image-handler's [package.json](https://github.com/aws-solutions/serverless-image-handler/blob/v6.3.2/source/image-handler/package.json), find the version of sharp in use, e.g. `0.32.6`
   * In that version of sharps' [package.json](https://github.com/lovell/sharp/blob/v0.32.6/package.json), find the version of libvips in use, e.g. `8.14.5`

   Set the variables in each build container / VM you use:

   ```bash
   export LIBVIPS_VERSION=8.14.5
   export SHARP_VERSION=0.32.6
   export SERVERLESS_IMAGE_HANDLER_VERSION=6.3.2
   export IMAGEHANDLER_VERSION=0.10.0
   ```

1. Build `mytours/sharp-lipvips`

   This needs to be on a Linux x64 system. (The next step is even more particular so you could use that instead for both).

   Ensure the target version builds without our changes:

   ```bash
   cd sharp-lipvips
   git remote add upstream https://github.com/lovell/sharp-libvips.git
   git fetch upstream
   git checkout v${LIBVIPS_VERSION}
   VERSION_LATEST_REQUIRED=false ./build.sh ${LIBVIPS_VERSION} linux-x64
   ```

   It will take 5-10 minutes to build. (I needed to remove a patch in `build/lin.sh` to get it to build.)

   Then apply our changes:

   ```bash
   git checkout openjpeg
   git rebase upstream/v${LIBVIPS_VERSION}
   # fix any merge conflicts
   VERSION_LATEST_REQUIRED=false ./build.sh ${LIBVIPS_VERSION} linux-x64
   # push changes
   ```

   Upload the library (you'll need AWS credentials loaded):

   ```bash
   aws s3 cp libvips-${LIBVIPS_VERSION}-linux-x64.tar.gz s3://stqry-libvips/v${LIBVIPS_VERSION}/
   aws s3 cp libvips-${LIBVIPS_VERSION}-linux-x64.tar.br s3://stqry-libvips/v${LIBVIPS_VERSION}/
   ```

1. Build `lovell/sharp`

   Find the version of `glibc` used in the Lambda runtime (e.g. `2.34`)

   ```bash
   docker run --entrypoint /bin/sh public.ecr.aws/lambda/nodejs:20 ldd --version
   ```

   This needs to be a Linux x64 system with the version of glibc that is equal or **lower** than the Lambda runtime.

   To make it easier to ensure compatibility, use the same OS that the Lambda runtime is derived from, i.e. Amazon Linux 2023 or CentOS. As I'm using Orbstack, which doesn't currently support Amazon Linux, I'm building on CentOS.

   Find the [CentOS distribution](https://distrowatch.com/table.php?distribution=CentOS) matching that glibc version (i.e. `CentOS 9`)

   Start a VM of that distribution and install build tools.

   ```bash
   sudo dnf groupinstall -y "Development Tools"
   sudo dnf install -y docker git rsync glib2 glib2-devel expat expat-devel
   # then set the version env vars as described in step 1
   ```

   Clone `mytours/sharp-lipvips` and `lovell/sharp` and build `sharp`:

   ```bash
   cd sharp
   git fetch origin
   git checkout v${SHARP_VERSION}
   npm install
   rm -rf vendor/${LIBVIPS_VERSION} # if you've run this before
   mkdir -p vendor/${LIBVIPS_VERSION}/linux-x64
   # this assumes you've built sharp-libvips on the same system; wget or copy it if not
   tar -C vendor/${LIBVIPS_VERSION}/linux-x64 -zxvf ../sharp-libvips/libvips-${LIBVIPS_VERSION}-linux-x64.tar.gz
   npm install
   rm -f prebuilds/* # if you've run this before
   npx prebuild --runtime napi
   ```

   Upload the library (needs AWS credentials):

   ```bash
   aws s3 cp prebuilds/sharp-v${SHARP_VERSION}-napi-v7-linux-x64.tar.gz s3://stqry-libvips/v${SHARP_VERSION}/
   ```
  
1. Build `serverless-image-handler`

   ```bash
   git fetch origin
   git checkout iiif
   git rebase v${SERVERLESS_IMAGE_HANDLER_VERSION}
   # fix any merge conflicts
   # bump the version in Makefile
   make imagehandler-${IMAGEHANDLER_VERSION}.zip
   ```

   Upload the runtime

   ```bash
   aws s3 cp imagehandler-${IMAGEHANDLER_VERSION}.zip s3://stqry-libvips/imagehandler-${IMAGEHANDLER_VERSION}.zip
   ```
