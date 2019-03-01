FROM ipfs/go-ipfs

RUN mkdir -p /data/ipfs-static
ENV IPFS_PATH /data/ipfs-static

COPY start_ipfs.sh /start_ipfs
RUN chmod a+x /start_ipfs
ENTRYPOINT ["/start_ipfs"]
