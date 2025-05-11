import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import glob
import json
import asyncio
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from db import engine, get_db
from models import BlockMetadata, Base

N8N_NODES_PATH = os.path.join(os.path.dirname(__file__), '../../n8n/packages/nodes-base/nodes')

async def load_blocks():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        for node_json in glob.glob(os.path.join(N8N_NODES_PATH, '*/*.node.json')):
            with open(node_json, encoding='utf-8') as f:
                data = json.load(f)
                block_id = data.get('node') or os.path.basename(node_json).replace('.node.json', '')
                name = block_id.split('.')[-1].capitalize()
                categories = data.get('categories', [])
                category = categories[0] if categories else None
                description = data.get('description') or ''
                tags = data.get('alias', [])
                exists = await session.execute(
                    sa.select(BlockMetadata).where(BlockMetadata.block_id == block_id)
                )
                if not exists.scalar_one_or_none():
                    meta = BlockMetadata(
                        block_id=block_id,
                        name=name,
                        category=category,
                        description=description,
                        custom_description=None,
                        tags=tags,
                        user_id=None,
                    )
                    session.add(meta)
        await session.commit()
    print('n8n blocks loaded into DB')

if __name__ == '__main__':
    asyncio.run(load_blocks()) 