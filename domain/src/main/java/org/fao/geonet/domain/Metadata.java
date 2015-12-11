package org.fao.geonet.domain;

import java.util.HashSet;
import java.util.Set;

import javax.annotation.Nonnull;
import javax.persistence.Access;
import javax.persistence.AccessType;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.FetchType;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.Table;

import org.apache.lucene.document.Document;
import org.fao.geonet.entitylistener.MetadataEntityListenerManager;

/**
 * @See {@link IMetadata}
 * @author Jesse
 */
@Entity
@Table(name = Metadata.TABLENAME)
@Access(AccessType.PROPERTY)
@EntityListeners(MetadataEntityListenerManager.class)
public class Metadata extends IMetadata {
    public static final String TABLENAME = "Metadata";

    public Metadata() {
        super();
    }
    
    public static Metadata createFromLuceneIndexDocument(Document doc) {
        Metadata metadata = new Metadata();
        transform(doc, metadata);
        return metadata;
    }
    
    private Set<MetadataCategory> _metadataCategories = new HashSet<MetadataCategory>();
    
    /**
     * Get the set of metadata categories this metadata is part of.  This is lazily loaded and all operations are
     * cascaded
     *
     * @return the metadata categories
     */
    @ManyToMany(cascade = {CascadeType.DETACH, CascadeType.REFRESH},
            fetch = FetchType.EAGER)
    @JoinTable(name = METADATA_CATEG_JOIN_TABLE_NAME,
            joinColumns = @JoinColumn(name = "metadataId"),
            inverseJoinColumns = @JoinColumn(name =
            METADATA_CATEG_JOIN_TABLE_CATEGORY_ID))
    @Nonnull
    public Set<MetadataCategory> getCategories() {
        return _metadataCategories;
    }

    /**
     * Set the metadata category
     *
     * @param categories
     */
    protected void setCategories(@Nonnull Set<MetadataCategory> categories) {
        this._metadataCategories = categories;
    }
}
