"""
Transform dprose.jsonlines as created by the event-classification project into a directory strucutre sutiable for serving.
"""
import argparse
import json
from os import path

parser = argparse.ArgumentParser(
    description="Transform dprose.jsonlines into directory"
)
parser.add_argument(
    "JSONLINES", help="Input jsonlines file with pre-computed events and dprose ids."
)
parser.add_argument("OUT_DIR", help="Ouptut directory")


def main(args):
    in_file = open(args.JSONLINES, "r")
    for line in in_file:
        data = json.loads(line)
        name = f"dprose_{data['dprose_id']}.json"
        out_path = path.join(args.OUT_DIR, name)
        out_file = open(out_path, "w")
        del data["dprose_id"]
        json.dump(data, out_file)
        out_file.close()


if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
