from sqlalchemy import Column, Integer, String, Text, ARRAY
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class BlockMetadata(Base):
    __tablename__ = 'block_metadata'
    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    description = Column(Text)
    custom_description = Column(Text)
    tags = Column(ARRAY(String))
    user_id = Column(Integer) 